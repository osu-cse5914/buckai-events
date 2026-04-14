import { embed } from "ai";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  AIConfigurationError,
  createAIModelRouter,
  type AIEnvironment,
  type ResolvedAITask,
} from "../lib/ai/router";

export type EventEmbeddingSource = {
  title: string;
  description: string;
  category: string | null;
  tags: string[];
};

export type SemanticSearchInput = {
  query: string;
  limit: number;
  type?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  minCompensation?: number;
  maxCompensation?: number;
  compensationType?: string;
  env?: AIEnvironment;
  embedQuery?: (query: string) => Promise<number[]>;
};

export type PaginatedSemanticSearchInput = SemanticSearchInput & {
  offset: number;
};

export type PaginatedSemanticSearchResult = {
  data: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
};

type EmbedLike = typeof embed;

function buildEmbeddingProviderOptions(task: ResolvedAITask) {
  const dimensions = task.model.dimensions;
  if (!dimensions) {
    return undefined;
  }

  switch (task.provider.type) {
    case "GOOGLE":
      return {
        google: {
          outputDimensionality: dimensions,
        },
      };
    case "CF_AI_GATEWAY":
      return undefined;
    case "OPENAI_COMPATIBLE":
      return {
        [task.provider.id]: {
          dimensions,
        },
      };
  }
}

function assertEmbeddingDimensions(
  embedding: number[],
  expectedDimensions?: number,
): number[] {
  if (
    expectedDimensions !== undefined &&
    embedding.length !== expectedDimensions
  ) {
    throw new AIConfigurationError(
      `Embedding task "embedding" expected ${expectedDimensions} dimensions, received ${embedding.length}`,
    );
  }

  return embedding;
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function buildEventEmbeddingText(input: EventEmbeddingSource): string {
  return [
    normalizeText(input.title),
    normalizeText(input.description),
    `Category: ${normalizeText(input.category)}`,
    `Tags: ${input.tags.map((tag) => tag.trim()).filter(Boolean).join(", ")}`,
  ].join(". ");
}

export async function createEventEmbeddingTextHash(
  input: EventEmbeddingSource,
): Promise<string> {
  const message = new TextEncoder().encode(
    [
      normalizeText(input.title),
      normalizeText(input.description),
      normalizeText(input.category),
      input.tags.join(","),
    ].join("\n"),
  );
  const digest = await crypto.subtle.digest("SHA-256", message);
  const bytes = new Uint8Array(digest);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function embedTextValue(
  value: string,
  {
    env,
    embedImpl = embed,
  }: {
    env?: AIEnvironment;
    embedImpl?: EmbedLike;
  } = {},
): Promise<number[]> {
  const router = createAIModelRouter({ env });
  const task = router.resolveTask("embedding");
  const providerOptions = buildEmbeddingProviderOptions(task);
  const result = await embedImpl({
    model: router.getEmbeddingModel("embedding") as never,
    value,
    providerOptions,
  });

  return assertEmbeddingDimensions(result.embedding, task.model.dimensions);
}

async function resolveQueryEmbedding(input: SemanticSearchInput) {
  return (
    input.embedQuery?.(input.query) ??
    embedTextValue(input.query, {
      env: input.env,
    })
  );
}

function buildSemanticSearchWhereClauses(input: Omit<SemanticSearchInput, "limit">) {
  const whereClauses = [
    Prisma.sql`e.status IN ('OPEN', 'IN_PROGRESS')`,
    Prisma.sql`e."startAt" > NOW()`,
  ];

  if (input.type) {
    whereClauses.push(Prisma.sql`e.type = ${input.type}`);
  }
  if (input.category) {
    whereClauses.push(Prisma.sql`e.category = ${input.category}`);
  }
  if (input.startDate) {
    whereClauses.push(
      Prisma.sql`e."startAt" >= ${input.startDate.toISOString()}`,
    );
  }
  if (input.endDate) {
    whereClauses.push(
      Prisma.sql`e."startAt" <= ${input.endDate.toISOString()}`,
    );
  }
  if (input.minCompensation !== undefined) {
    whereClauses.push(
      Prisma.sql`e."compensationAmount" >= ${input.minCompensation}`,
    );
  }
  if (input.maxCompensation !== undefined) {
    whereClauses.push(
      Prisma.sql`e."compensationAmount" <= ${input.maxCompensation}`,
    );
  }
  if (input.compensationType) {
    whereClauses.push(
      Prisma.sql`e."compensationType" = ${input.compensationType}`,
    );
  }

  return whereClauses;
}

function parseTotalCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    return Number.parseInt(value, 10);
  }

  return 0;
}

export async function generateEventEmbedding(
  input: EventEmbeddingSource,
  {
    env,
    embedImpl = embed,
  }: {
    env?: AIEnvironment;
    embedImpl?: EmbedLike;
  } = {},
): Promise<{ embedding: number[]; textHash: string }> {
  const [embedding, textHash] = await Promise.all([
    embedTextValue(buildEventEmbeddingText(input), { env, embedImpl }),
    createEventEmbeddingTextHash(input),
  ]);

  return { embedding, textHash };
}

export async function storeEventEmbedding(
  prisma: PrismaClient,
  {
    eventId,
    embedding,
    textHash,
  }: {
    eventId: string;
    embedding: number[];
    textHash: string;
  },
) {
  const vectorLiteral = `[${embedding.join(",")}]`;

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "EventEmbedding" (
        "id",
        "eventId",
        "embedding",
        "textHash",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${`ee_${eventId}`},
        ${eventId},
        ${vectorLiteral}::vector,
        ${textHash},
        NOW(),
        NOW()
      )
      ON CONFLICT ("eventId")
      DO UPDATE SET
        "embedding" = EXCLUDED."embedding",
        "textHash" = EXCLUDED."textHash",
        "updatedAt" = NOW()
    `,
  );
}

export async function searchEventsSemantically(
  prisma: PrismaClient,
  input: SemanticSearchInput,
) {
  const vector = await resolveQueryEmbedding(input);
  const vectorLiteral = `[${vector.join(",")}]`;
  const whereClauses = buildSemanticSearchWhereClauses(input);

  return prisma.$queryRaw<
    Array<Record<string, unknown> & { similarity: number }>
  >(Prisma.sql`
    SELECT
      e.id,
      e.title,
      e.description,
      e.summary,
      e.type,
      e.source,
      e.status,
      e.category,
      e.tags,
      e."imageUrl",
      e."ticketUrl",
      e."externalUrl",
      e."locationName",
      e."locationLatitude",
      e."locationLongitude",
      e."startAt",
      e."endAt",
      e."compensationAmount",
      e."compensationCurrency",
      e."compensationType",
      e."creatorId",
      e."createdAt",
      e."updatedAt",
      (1 - (ee.embedding <=> ${vectorLiteral}::vector))::double precision AS similarity
    FROM "Event" e
    INNER JOIN "EventEmbedding" ee ON ee."eventId" = e.id
    WHERE ${Prisma.join(whereClauses, " AND ")}
    ORDER BY similarity DESC
    LIMIT ${input.limit}
  `);
}

export async function searchEventsSemanticallyPaginated(
  prisma: PrismaClient,
  input: PaginatedSemanticSearchInput,
): Promise<PaginatedSemanticSearchResult> {
  const vector = await resolveQueryEmbedding(input);
  const vectorLiteral = `[${vector.join(",")}]`;
  const whereClauses = buildSemanticSearchWhereClauses(input);
  const matches = await prisma.$queryRaw<
    Array<{ id: string; totalCount: number | bigint | string }>
  >(Prisma.sql`
    SELECT
      e.id,
      COUNT(*) OVER() AS "totalCount"
    FROM "Event" e
    INNER JOIN "EventEmbedding" ee ON ee."eventId" = e.id
    WHERE ${Prisma.join(whereClauses, " AND ")}
    ORDER BY (1 - (ee.embedding <=> ${vectorLiteral}::vector))::double precision DESC
    LIMIT ${input.limit}
    OFFSET ${input.offset}
  `);

  if (matches.length === 0) {
    return {
      data: [],
      total: 0,
      limit: input.limit,
      offset: input.offset,
    };
  }

  const orderedIds = matches.map((row) => row.id);
  const events = await prisma.event.findMany({
    where: {
      id: {
        in: orderedIds,
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });
  const order = new Map(orderedIds.map((id, index) => [id, index]));

  return {
    data: events.sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    ),
    total: parseTotalCount(matches[0]?.totalCount),
    limit: input.limit,
    offset: input.offset,
  };
}
