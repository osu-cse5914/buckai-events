import { randomUUID, createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type EmbeddableEvent = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
  type?: "EVENT" | "GIG";
  status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startAt?: Date;
};

export type SemanticSearchInput = {
  query: string;
  type?: "EVENT" | "GIG";
  category?: string;
  startDate?: Date;
  endDate?: Date;
  limit: number;
};

type EmbeddingGenerator = (
  text: string,
  options?: { outputDimensionality?: number; apiKey?: string },
) => Promise<number[]>;

type EventWithEmbedding = EmbeddableEvent & {
  embedding?: {
    embedding?: unknown;
  } | null;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function buildEventEmbeddingText(event: EmbeddableEvent): string {
  const title = normalizeText(event.title);
  const description = normalizeText(event.description);
  const category = normalizeText(event.category);
  const tags = event.tags.map((tag) => tag.trim()).filter(Boolean).join(", ");

  return `${title}. ${description}. Category: ${category}. Tags: ${tags}`;
}

export function computeEventTextHash(event: EmbeddableEvent): string {
  return createHash("sha256").update(buildEventEmbeddingText(event)).digest("hex");
}

function resolveApiKey(explicitApiKey?: string): string | undefined {
  if (explicitApiKey) {
    return explicitApiKey;
  }

  if (typeof process === "undefined") {
    return undefined;
  }

  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}

export async function generateEmbedding(
  text: string,
  options: { outputDimensionality?: number; apiKey?: string } = {},
): Promise<number[]> {
  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY must be configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text }],
        },
        outputDimensionality: options.outputDimensionality ?? 768,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}`);
  }

  const body = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  const values = body.embedding?.values;

  if (!Array.isArray(values) || values.some((value) => typeof value !== "number")) {
    throw new Error("Embedding response did not contain numeric values");
  }

  return values;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

function readEmbeddingValues(value: unknown): number[] | null {
  if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "values" in value &&
    Array.isArray((value as { values?: unknown }).values)
  ) {
    const values = (value as { values: unknown[] }).values;
    return values.every((entry) => typeof entry === "number")
      ? (values as number[])
      : null;
  }

  return null;
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return -1;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return -1;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export async function syncEventEmbedding(
  prisma: PrismaClient,
  event: EmbeddableEvent,
  embeddingGenerator: EmbeddingGenerator = generateEmbedding,
): Promise<{ changed: boolean; textHash: string }> {
  const textHash = computeEventTextHash(event);
  const existing = await prisma.eventEmbedding.findUnique({
    where: { eventId: event.id },
    select: { textHash: true },
  });

  if (existing?.textHash === textHash) {
    return { changed: false, textHash };
  }

  const embedding = await embeddingGenerator(buildEventEmbeddingText(event), {
    outputDimensionality: 768,
  });

  await prisma.$queryRawUnsafe(
    `
      INSERT INTO "EventEmbedding" ("id", "eventId", "embedding", "textHash", "createdAt", "updatedAt")
      VALUES ($1, $2, $3::vector, $4, NOW(), NOW())
      ON CONFLICT ("eventId")
      DO UPDATE SET
        "embedding" = EXCLUDED."embedding",
        "textHash" = EXCLUDED."textHash",
        "updatedAt" = NOW()
    `,
    randomUUID(),
    event.id,
    toVectorLiteral(embedding),
    textHash,
  );

  return { changed: true, textHash };
}

export async function searchEventsSemantically(
  prisma: PrismaClient,
  input: SemanticSearchInput,
  embeddingGenerator: EmbeddingGenerator = generateEmbedding,
): Promise<Array<EventWithEmbedding & { similarity: number }>> {
  const queryEmbedding = await embeddingGenerator(input.query, {
    outputDimensionality: 768,
  });

  const events = (await prisma.event.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      startAt: {
        gt: new Date(),
        ...(input.startDate ? { gte: input.startDate } : {}),
        ...(input.endDate ? { lte: input.endDate } : {}),
      },
      ...(input.type ? { type: input.type } : {}),
      ...(input.category ? { category: input.category } : {}),
    },
    include: { embedding: true },
    take: input.limit,
  })) as EventWithEmbedding[];

  return events
    .map((event) => {
      const storedEmbedding = readEmbeddingValues(event.embedding?.embedding);
      if (!storedEmbedding) {
        return null;
      }

      return {
        ...event,
        similarity: cosineSimilarity(queryEmbedding, storedEmbedding),
      };
    })
    .filter((event): event is EventWithEmbedding & { similarity: number } => !!event)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, input.limit);
}
