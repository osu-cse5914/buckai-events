import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockPrisma } from "./helpers/prisma";
import { searchEventsSemantically } from "../services/event-embeddings";

describe("[phase:4] [regression:always] Event semantic search", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
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
        "EVENT",
        "2026-04-01T00:00:00.000Z",
        "2026-04-02T00:00:00.000Z",
      ]),
    );
  });
});
