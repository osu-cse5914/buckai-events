import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockPrisma } from "./helpers/prisma";
import { syncExternalEvents } from "../services/external-ingestion";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function makeStoredExternalEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_external_1",
    title: "Stored external event",
    description: "Stored description",
    summary: null,
    type: "EVENT",
    source: "OSU_API",
    externalId: "https://studentlife.osu.edu/Events.aspx?e=83306",
    sourceHash: "abc123",
    externalUrl: "https://studentlife.osu.edu/Events.aspx?e=83306",
    category: null,
    tags: [],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: new Date("2026-03-03T11:45:00.000Z"),
    endAt: new Date("2026-03-04T01:15:00.000Z"),
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    status: "OPEN",
    creatorId: null,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeOsuEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "https://studentlife.osu.edu/Events.aspx?e=83306",
    itemHash: "abc123",
    title: "Group Fitness Classes",
    description: "RPAC/North Rec (check schedule)",
    content: "**Try a group fitness class...**",
    startDate: "2026-03-03T11:45:00.000Z",
    endDate: "2026-03-04T01:15:00.000Z",
    location: "RPAC/North Rec (check schedule)",
    tags: ["Sports", "Health and Wellness", "Social"],
    link: "https://studentlife.osu.edu/Events.aspx?e=83306",
    label: "Student Life",
    campus: "columbus",
    color: "#bb0000",
    ...overrides,
  };
}

function makeTicketmasterEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "tm_67890",
    name: "Columbus Concert Night",
    info: "Live music downtown",
    url: "https://www.ticketmaster.com/event/tm_67890",
    dates: {
      start: {
        dateTime: "2026-04-05T00:00:00.000Z",
      },
    },
    _embedded: {
      venues: [
        {
          name: "Nationwide Arena",
          city: { name: "Columbus" },
          state: { stateCode: "OH" },
          country: { countryCode: "US" },
          location: {
            latitude: "39.9690",
            longitude: "-83.0062",
          },
        },
      ],
    },
    ...overrides,
  };
}

function stubExternalFetch({
  osuEvents = [],
  ticketmasterPages = [],
}: {
  osuEvents?: unknown[];
  ticketmasterPages?: unknown[];
}) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes("content.osu.edu")) {
      return jsonResponse({
        status: "success",
        data: {
          events: osuEvents,
        },
      });
    }

    if (url.includes("ticketmaster")) {
      const pageParam = new URL(url).searchParams.get("page");
      const pageIndex = Number(pageParam ?? "0");
      const payload =
        (ticketmasterPages[pageIndex] as Record<string, unknown> | undefined) ?? {
          _embedded: { events: [] },
          page: { totalPages: 1, number: 0 },
        };

      return jsonResponse(payload);
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("[phase:4] [regression:always] External event ingestion", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // S-ING-2 → TC-ING-002
  it("TC-ING-002: updates an existing OSU event when the incoming hash changes", async () => {
    stubExternalFetch({
      osuEvents: [makeOsuEvent({ itemHash: "def456", content: "Updated body copy" })],
    });

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      makeStoredExternalEvent() as never,
    );
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.event.update).mockResolvedValue(
      makeStoredExternalEvent({ sourceHash: "def456" }) as never,
    );

    await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
    });

    expect(mockPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "evt_external_1",
        },
        data: expect.objectContaining({
          description: "Updated body copy",
          sourceHash: "def456",
          externalUrl: "https://studentlife.osu.edu/Events.aspx?e=83306",
        }),
      }),
    );
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  // S-ING-2a → TC-ING-003
  it("TC-ING-003: skips database writes when an OSU event hash matches", async () => {
    stubExternalFetch({
      osuEvents: [makeOsuEvent({ itemHash: "abc123" })],
    });

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      makeStoredExternalEvent() as never,
    );
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);

    await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
    });

    expect(mockPrisma.event.update).not.toHaveBeenCalled();
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  // S-ING-3 → TC-ING-004
  it("TC-ING-004: creates a new Ticketmaster event with ticketUrl populated", async () => {
    stubExternalFetch({
      ticketmasterPages: [
        {
          _embedded: {
            events: [makeTicketmasterEvent()],
          },
          page: {
            totalPages: 1,
            number: 0,
          },
        },
      ],
    });

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.event.create).mockResolvedValue(
      makeStoredExternalEvent({
        source: "TICKETMASTER",
        externalId: "tm_67890",
        ticketUrl: "https://www.ticketmaster.com/event/tm_67890",
        externalUrl: null,
      }) as never,
    );

    await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
    });

    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "TICKETMASTER",
          externalId: "tm_67890",
          ticketUrl: "https://www.ticketmaster.com/event/tm_67890",
          creatorId: null,
          status: "OPEN",
        }),
      }),
    );
  });

  // S-ING-4 → TC-ING-005
  it("TC-ING-005: marks disappeared past external events as COMPLETED", async () => {
    stubExternalFetch({});

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);
    vi.mocked(mockPrisma.event.findMany)
      .mockResolvedValueOnce([
        makeStoredExternalEvent({
          id: "evt_past_osu",
          externalId: "https://studentlife.osu.edu/Events.aspx?e=10000",
          endAt: new Date("2026-03-01T00:00:00.000Z"),
        }),
      ] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(mockPrisma.event.updateMany).mockResolvedValue({ count: 1 } as never);

    await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
      now: new Date("2026-03-31T12:00:00.000Z"),
    });

    expect(mockPrisma.event.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["evt_past_osu"],
        },
      },
      data: {
        status: "COMPLETED",
      },
    });
  });

  // S-ING-5 → TC-ING-006
  it("TC-ING-006: updates the existing Ticketmaster row instead of creating a duplicate", async () => {
    stubExternalFetch({
      ticketmasterPages: [
        {
          _embedded: {
            events: [makeTicketmasterEvent({ info: "Updated live music lineup" })],
          },
          page: {
            totalPages: 1,
            number: 0,
          },
        },
      ],
    });

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      makeStoredExternalEvent({
        id: "evt_tm_existing",
        source: "TICKETMASTER",
        externalId: "tm_67890",
        sourceHash: "old_hash",
        ticketUrl: "https://www.ticketmaster.com/event/tm_67890",
      }) as never,
    );
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.event.update).mockResolvedValue(
      makeStoredExternalEvent({
        id: "evt_tm_existing",
        source: "TICKETMASTER",
        externalId: "tm_67890",
      }) as never,
    );

    await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
    });

    expect(mockPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "evt_tm_existing",
        },
        data: expect.objectContaining({
          source: "TICKETMASTER",
          externalId: "tm_67890",
          description: "Updated live music lineup",
        }),
      }),
    );
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  // S-ING-8 → TC-ING-009
  it("TC-ING-009: leaves disappeared future external events unchanged", async () => {
    stubExternalFetch({});

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);
    vi.mocked(mockPrisma.event.findMany)
      .mockResolvedValueOnce([
        makeStoredExternalEvent({
          id: "evt_future_osu",
          externalId: "https://studentlife.osu.edu/Events.aspx?e=99999",
          endAt: new Date("2026-04-30T00:00:00.000Z"),
        }),
      ] as never)
      .mockResolvedValueOnce([] as never);

    await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
      now: new Date("2026-03-31T12:00:00.000Z"),
    });

    expect(mockPrisma.event.updateMany).not.toHaveBeenCalled();
  });

  // S-ING-9 → TC-ING-010
  it('TC-ING-010: ingests only OSU events whose campus is "columbus"', async () => {
    stubExternalFetch({
      osuEvents: [
        makeOsuEvent({
          id: "https://studentlife.osu.edu/Events.aspx?e=83306",
          campus: "columbus",
          location: "RPAC",
          description: "Short venue fallback",
          content: "Mapped OSU body",
        }),
        makeOsuEvent({
          id: "https://studentlife.osu.edu/Events.aspx?e=90000",
          campus: "lima",
        }),
      ],
    });

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.event.create).mockResolvedValue(
      makeStoredExternalEvent({
        locationName: "RPAC",
        description: "Mapped OSU body",
      }) as never,
    );

    await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
    });

    expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "OSU_API",
          externalId: "https://studentlife.osu.edu/Events.aspx?e=83306",
          locationName: "RPAC",
          description: "Mapped OSU body",
          externalUrl: "https://studentlife.osu.edu/Events.aspx?e=83306",
        }),
      }),
    );
  });

});

describe("[phase:6] [regression:always] External event ingestion summaries", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("TC-ING-012: returns per-source summary counters for the completed sync", async () => {
    stubExternalFetch({
      osuEvents: [makeOsuEvent()],
      ticketmasterPages: [
        {
          _embedded: {
            events: [makeTicketmasterEvent({ info: "Updated live music lineup" })],
          },
          page: {
            totalPages: 1,
            number: 0,
          },
        },
      ],
    });

    vi.mocked(mockPrisma.event.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(
        makeStoredExternalEvent({
          id: "evt_tm_existing",
          source: "TICKETMASTER",
          externalId: "tm_67890",
          sourceHash: "old_hash",
          ticketUrl: "https://www.ticketmaster.com/event/tm_67890",
        }) as never,
      );
    vi.mocked(mockPrisma.event.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(mockPrisma.event.create).mockResolvedValue(
      makeStoredExternalEvent() as never,
    );
    vi.mocked(mockPrisma.event.update).mockResolvedValue(
      makeStoredExternalEvent({
        id: "evt_tm_existing",
        source: "TICKETMASTER",
        externalId: "tm_67890",
      }) as never,
    );

    const result = await syncExternalEvents(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
      now: new Date("2026-03-31T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      startedAt: expect.any(Date),
      finishedAt: expect.any(Date),
      sources: {
        osu: { fetched: 1, created: 1, updated: 0, skipped: 0, completed: 0 },
        ticketmaster: { fetched: 1, created: 0, updated: 1, skipped: 0, completed: 0 },
      },
    });
  });

  it("TC-ING-013: skips Ticketmaster when the API key is missing and still syncs OSU", async () => {
    const fetchMock = stubExternalFetch({
      osuEvents: [makeOsuEvent()],
    });

    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);
    vi.mocked(mockPrisma.event.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(mockPrisma.event.create).mockResolvedValue(
      makeStoredExternalEvent() as never,
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const result = await syncExternalEvents(mockPrisma, {
        now: new Date("2026-03-31T12:00:00.000Z"),
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toContain("content.osu.edu");
      expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        startedAt: expect.any(Date),
        finishedAt: expect.any(Date),
        sources: {
          osu: { fetched: 1, created: 1, updated: 0, skipped: 0, completed: 0 },
          ticketmaster: { fetched: 0, created: 0, updated: 0, skipped: 0, completed: 0 },
        },
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "Skipping Ticketmaster sync because TICKETMASTER_API_KEY is missing",
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
