import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockPrisma } from "./helpers/prisma";
import {
  type EmbeddableEvent,
  buildEventEmbeddingText,
  computeEventTextHash,
  searchEventsSemantically,
  syncEventEmbedding,
} from "../services/embeddings";

function makeEvent(overrides: Partial<EmbeddableEvent> = {}): EmbeddableEvent {
  return {
    id: "evt_1",
    title: "Jazz Night",
    description: "Live jazz at the Union",
    category: "music",
    tags: ["live", "student"],
    type: "EVENT",
    status: "OPEN",
    startAt: new Date("2099-04-01T09:00:00Z"),
    ...overrides,
  };
}

describe("[phase:4] [regression:always] Embeddings & Semantic Search", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-EMBED-001: creates an embedding row with vector data and textHash", async () => {
    vi.mocked(mockPrisma.eventEmbedding.findUnique).mockResolvedValue(null as never);
    vi.mocked(mockPrisma.$queryRawUnsafe).mockResolvedValue([] as never);
    const generate = vi.fn().mockResolvedValue([0.9, 0.1, 0.2]);
    const event = makeEvent();

    const result = await syncEventEmbedding(mockPrisma, event, generate);

    expect(result.changed).toBe(true);
    expect(result.textHash).toBe(computeEventTextHash(event));
    expect(generate).toHaveBeenCalledWith(buildEventEmbeddingText(event), {
      outputDimensionality: 768,
    });
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "EventEmbedding"'),
      expect.any(String),
      "evt_1",
      "[0.9,0.1,0.2]",
      result.textHash,
    );
  });

  it("TC-EMBED-002: regenerates the embedding when content changes", async () => {
    vi.mocked(mockPrisma.eventEmbedding.findUnique).mockResolvedValue({
      textHash: "stale-hash",
    } as never);
    vi.mocked(mockPrisma.$queryRawUnsafe).mockResolvedValue([] as never);
    const generate = vi.fn().mockResolvedValue([0.4, 0.3, 0.2]);

    const result = await syncEventEmbedding(
      mockPrisma,
      makeEvent({ description: "Updated event details" }),
      generate,
    );

    expect(result.changed).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("TC-EMBED-003: skips regeneration when the stored textHash is still current", async () => {
    const event = makeEvent();
    vi.mocked(mockPrisma.eventEmbedding.findUnique).mockResolvedValue({
      textHash: computeEventTextHash(event),
    } as never);
    const generate = vi.fn();

    const result = await syncEventEmbedding(mockPrisma, event, generate);

    expect(result.changed).toBe(false);
    expect(generate).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("TC-EMBED-004: ranks semantically similar events higher", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        {
          ...makeEvent({ id: "evt_music", title: "Jazz Night" }),
          embedding: { embedding: [1, 0] },
        },
        {
          ...makeEvent({ id: "evt_rock", title: "Rock Show" }),
          embedding: { embedding: [0.8, 0.2] },
        },
        {
          ...makeEvent({
            id: "evt_study",
            title: "Study Group",
            category: "academic",
          }),
          embedding: { embedding: [0, 1] },
        },
      ] as never,
    );
    const generate = vi.fn().mockResolvedValue([1, 0]);

    const result = await searchEventsSemantically(
      mockPrisma,
      { query: "live music events", limit: 3 },
      generate,
    );

    expect(result.map((event) => event.id)).toEqual([
      "evt_music",
      "evt_rock",
      "evt_study",
    ]);
  });

  it("TC-EMBED-005: combines semantic ranking with structured filters", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    const generate = vi.fn().mockResolvedValue([0.1, 0.2]);

    await searchEventsSemantically(
      mockPrisma,
      {
        query: "something fun tonight",
        category: "music",
        type: "EVENT",
        limit: 5,
      },
      generate,
    );

    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "music",
          type: "EVENT",
          status: { in: ["OPEN", "IN_PROGRESS"] },
        }),
        include: { embedding: true },
        take: 5,
      }),
    );
  });
});
