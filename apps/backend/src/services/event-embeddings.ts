import { embed } from "ai";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  createAIModelRouter,
  type AIEnvironment,
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
  env?: AIEnvironment;
  embedQuery?: (query: string) => Promise<number[]>;
};

type EmbedLike = typeof embed;

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
  const result = await embedImpl({
    model: router.getEmbeddingModel("embedding") as never,
    value,
  });

  return result.embedding;
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
  const queryEmbedding =
    input.embedQuery?.(input.query) ??
    embedTextValue(input.query, {
      env: input.env,
    });
  const vector = await queryEmbedding;
  const vectorLiteral = `[${vector.join(",")}]`;

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
