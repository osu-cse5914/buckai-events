import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockPrisma } from "./helpers/prisma";
import {
  generateEventEmbedding,
  searchRelatedEventsByEvent,
  searchEventsSemantically,
  searchEventsSemanticallyPaginated,
} from "../services/event-embeddings";

const embeddingEnv = {
  AI_ROUTER_CONFIG_JSON: JSON.stringify({
    providers: {
      openrouter: {
        id: "openrouter",
        type: "OPENAI_COMPATIBLE",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        baseUrl: "https://openrouter.ai/api/v1",
      },
    },
    models: {
      "text-embed": {
        id: "text-embed",
        providerId: "openrouter",
        modelId: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
        type: "EMBEDDING",
        dimensions: 768,
      },
    },
    tasks: {
      embedding: {
        id: "embedding",
        modelId: "text-embed",
      },
    },
  }),
  OPENROUTER_API_KEY: "test-key",
} as const;

describe("[phase:4] [regression:always] Event semantic search", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("TC-EMBED-010: requests configured dimensions when generating an event embedding", async () => {
    const embedImpl = vi.fn().mockResolvedValue({
      embedding: Array.from({ length: 768 }, (_, index) => index / 1000),
    });

    await generateEventEmbedding(
      {
        title: "Ringling Bros. and Barnum & Bailey",
        description: "Circus arts performance night",
        category: "arts",
        tags: ["circus", "performance"],
      },
      {
        env: embeddingEnv,
        embedImpl,
      },
    );

    expect(embedImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        value:
          "Ringling Bros. and Barnum & Bailey. Circus arts performance night. Category: arts. Tags: circus, performance",
        providerOptions: {
          openrouter: {
            dimensions: 768,
          },
        },
      }),
    );
  });

  it("TC-EMBED-011: rejects vectors whose length does not match the configured dimensions", async () => {
    const embedImpl = vi.fn().mockResolvedValue({
      embedding: Array.from({ length: 2048 }, (_, index) => index / 1000),
    });

    await expect(
      generateEventEmbedding(
        {
          title: "Ringling Bros. and Barnum & Bailey",
          description: "Circus arts performance night",
          category: "arts",
          tags: ["circus", "performance"],
        },
        {
          env: embeddingEnv,
          embedImpl,
        },
      ),
    ).rejects.toThrow("expected 768 dimensions, received 2048");
  });

  it("TC-EMBED-004: returns ranked semantic search results", async () => {
    const embedQuery = vi.fn().mockResolvedValue([0.42, 0.13, 0.88]);
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([
      {
        id: "evt_music",
        title: "Jazz Night at the Union",
        description: "Live jazz performance",
        summary: "Student jazz showcase",
        type: "EVENT",
        source: "USER",
        status: "OPEN",
        category: "music",
        tags: ["jazz", "live-music"],
        imageUrl: null,
        ticketUrl: null,
        externalUrl: null,
        locationName: "Ohio Union",
        locationLatitude: null,
        locationLongitude: null,
        startAt: new Date("2026-04-01T09:00:00Z"),
        endAt: null,
        compensationAmount: null,
        compensationCurrency: "USD",
        compensationType: null,
        creatorId: "user_a",
        createdAt: new Date("2026-03-31T12:00:00Z"),
        updatedAt: new Date("2026-03-31T12:00:00Z"),
        similarity: 0.97,
      },
      {
        id: "evt_rock",
        title: "Rock Concert",
        description: "Campus music night",
        summary: null,
        type: "EVENT",
        source: "USER",
        status: "OPEN",
        category: "music",
        tags: ["rock"],
        imageUrl: null,
        ticketUrl: null,
        externalUrl: null,
        locationName: "Newport",
        locationLatitude: null,
        locationLongitude: null,
        startAt: new Date("2026-04-02T09:00:00Z"),
        endAt: null,
        compensationAmount: null,
        compensationCurrency: "USD",
        compensationType: null,
        creatorId: "user_b",
        createdAt: new Date("2026-03-31T12:00:00Z"),
        updatedAt: new Date("2026-03-31T12:00:00Z"),
        similarity: 0.92,
      },
    ] as never);

    const results = await searchEventsSemantically(mockPrisma, {
      query: "live music events",
      limit: 5,
      embedQuery,
    });

    expect(embedQuery).toHaveBeenCalledWith("live music events");
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: "evt_music",
      similarity: 0.97,
    });
    expect(results[1]).toMatchObject({
      id: "evt_rock",
      similarity: 0.92,
    });
  });

  it("TC-EMBED-005: includes structured filters in the semantic search query", async () => {
    const embedQuery = vi.fn().mockResolvedValue([0.42, 0.13, 0.88]);
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([] as never);

    await searchEventsSemantically(mockPrisma, {
      query: "something fun tonight",
      limit: 10,
      type: "EVENT",
      category: "music",
      tag: "live-music",
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-04-02T00:00:00Z"),
      embedQuery,
    });

    const sql = vi.mocked(mockPrisma.$queryRaw).mock.calls[0]?.[0] as {
      values?: unknown[];
    };

    expect(sql.values).toEqual(
      expect.arrayContaining([
        "music",
        "live-music",
        "EVENT",
        "2026-04-01T00:00:00.000Z",
        "2026-04-02T00:00:00.000Z",
      ]),
    );
  });

  it("TC-EMBED-013: preserves total count while paginating semantic search results", async () => {
    const embedQuery = vi.fn().mockResolvedValue([0.42, 0.13, 0.88]);
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([
      {
        id: "evt_offset",
        totalCount: 7,
      },
    ] as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        {
          id: "evt_offset",
          title: "Campus Jazz Night",
          description: "Live music at the Union",
          summary: null,
          type: "EVENT",
          source: "USER",
          status: "OPEN",
          category: "music",
          tags: ["jazz"],
          imageUrl: null,
          ticketUrl: null,
          externalUrl: null,
          locationName: "Ohio Union",
          locationLatitude: null,
          locationLongitude: null,
          startAt: new Date("2026-04-01T09:00:00Z"),
          endAt: null,
          compensationAmount: null,
          compensationCurrency: "USD",
          compensationType: null,
          creatorId: "user_a",
          createdAt: new Date("2026-03-31T12:00:00Z"),
          updatedAt: new Date("2026-03-31T12:00:00Z"),
          creator: {
            id: "user_a",
            displayName: "Alice",
            email: "alice@osu.edu",
          },
        },
      ] as never,
    );

    const result = await searchEventsSemanticallyPaginated(mockPrisma, {
      query: "live music events",
      limit: 2,
      offset: 4,
      embedQuery,
    });

    expect(result).toMatchObject({
      total: 7,
      limit: 2,
      offset: 4,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: "evt_offset",
      title: "Campus Jazz Night",
    });
    const sql = vi.mocked(mockPrisma.$queryRaw).mock.calls[0]?.[0] as {
      values?: unknown[];
    };
    expect(sql.values).toEqual(expect.arrayContaining([2, 4]));
  });

  it("TC-EMBED-014: returns same-type related events ranked by vector similarity and excludes the source event", async () => {
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([
      {
        id: "evt_related_1",
        totalCount: 2,
      },
      {
        id: "evt_related_2",
        totalCount: 2,
      },
    ] as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        {
          id: "evt_related_2",
          title: "Campus Open Mic",
          description: "Student showcase",
          summary: null,
          type: "EVENT",
          source: "USER",
          status: "OPEN",
          category: "music",
          tags: ["music"],
          imageUrl: null,
          ticketUrl: null,
          externalUrl: null,
          locationName: "Ohio Union",
          locationLatitude: null,
          locationLongitude: null,
          startAt: new Date("2026-04-05T19:00:00Z"),
          endAt: null,
          compensationAmount: null,
          compensationCurrency: "USD",
          compensationType: null,
          creatorId: "user_b",
          createdAt: new Date("2026-03-31T12:00:00Z"),
          updatedAt: new Date("2026-03-31T12:00:00Z"),
          creator: {
            id: "user_b",
            displayName: "Bob",
            email: "bob@osu.edu",
          },
        },
        {
          id: "evt_related_1",
          title: "Late Night Jam Session",
          description: "Improvised music set",
          summary: "An improv set with student musicians.",
          type: "EVENT",
          source: "USER",
          status: "OPEN",
          category: "music",
          tags: ["jazz"],
          imageUrl: null,
          ticketUrl: null,
          externalUrl: null,
          locationName: "Thompson Library",
          locationLatitude: null,
          locationLongitude: null,
          startAt: new Date("2026-04-04T21:00:00Z"),
          endAt: null,
          compensationAmount: null,
          compensationCurrency: "USD",
          compensationType: null,
          creatorId: "user_a",
          createdAt: new Date("2026-03-31T12:00:00Z"),
          updatedAt: new Date("2026-03-31T12:00:00Z"),
          creator: {
            id: "user_a",
            displayName: "Alice",
            email: "alice@osu.edu",
          },
        },
      ] as never,
    );

    const result = await searchRelatedEventsByEvent(mockPrisma, {
      eventId: "evt_source",
      type: "EVENT",
      limit: 3,
    });

    expect(result).toMatchObject({
      total: 2,
      limit: 3,
      offset: 0,
    });
    expect(result.data.map((event) => event.id)).toEqual([
      "evt_related_1",
      "evt_related_2",
    ]);

    const sql = vi.mocked(mockPrisma.$queryRaw).mock.calls[0]?.[0] as {
      values?: unknown[];
    };
    expect(sql.values).toEqual(expect.arrayContaining(["evt_source", "EVENT"]));
  });
});
