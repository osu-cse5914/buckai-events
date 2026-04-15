import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClerkGetUser = vi.fn();

vi.mock("@hono/clerk-auth", () => ({
  clerkMiddleware: () =>
    async (
      c: { set: (key: string, value: unknown) => void },
      next: () => Promise<void>,
    ) => {
      c.set("clerk", { users: { getUser: mockClerkGetUser } });
      await next();
    },
  getAuth: vi.fn(),
}));

vi.mock("../lib/prisma");

import { getAuth } from "@hono/clerk-auth";
import { getPrisma, getPrismaClient } from "../lib/prisma";
import { app } from "../index";
import {
  buildEventWithCreatorAndInteractions,
  buildInteraction,
  buildUser,
} from "./factories";
import { createMockPrisma } from "./helpers/prisma";
import { makeAuthRequest } from "./helpers/context";

const CURRENT_USER = buildUser({
  id: "user_rec_1",
  clerkId: "clerk_rec_1",
  email: "recs@osu.edu",
  displayName: "Rec User",
  major: null,
  gradYear: null,
  interests: ["music", "tech"],
  followerCount: 0,
  followingCount: 0,
  createdAt: new Date("2026-03-01T00:00:00Z"),
  updatedAt: new Date("2026-03-01T00:00:00Z"),
});

function makeInteraction(id: string) {
  return buildInteraction({
    id,
    userId: "other_user",
    eventId: "evt_unused",
    action: "VIEW",
    createdAt: new Date("2099-03-20T00:00:00Z"),
  });
}

function makeEvent(
  overrides: Record<string, unknown> = {},
  interactionCount = 0,
) {
  return buildEventWithCreatorAndInteractions({
    id: "evt_1",
    title: "Event",
    description: "Description",
    category: null,
    creatorId: "creator_1",
    startAt: new Date("2099-04-10T12:00:00Z"),
    createdAt: new Date("2026-03-01T00:00:00Z"),
    updatedAt: new Date("2026-03-01T00:00:00Z"),
    creator: {
      id: "creator_1",
      displayName: "Creator",
      email: "creator@osu.edu",
    },
    interactions: Array.from({ length: interactionCount }, (_, index) => ({
      id: makeInteraction(`int_${index}`).id,
    })),
    ...overrides,
  });
}

describe("[phase:4] [regression:always] GET /api/v1/recommendations", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: CURRENT_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(CURRENT_USER as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.interaction.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.interaction.count).mockResolvedValue(1 as never);
  });

  it("TC-REC-MODEL-001: boosts events matching the user's interests", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_music", category: "music" }, 2),
        makeEvent({ id: "evt_sports", category: "sports" }, 2),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string }>;
      meta: { total: number; limit: number; offset: number; rankingMode: string };
    };
    expect(body.items.map((item) => item.id)).toEqual([
      "evt_music",
      "evt_sports",
    ]);
    expect(body.meta).toMatchObject({
      total: 2,
      limit: 20,
      offset: 0,
      rankingMode: "PERSONALIZED",
    });
  });

  it("TC-REC-MODEL-002: ranks more popular items ahead when interest match is tied", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_popular", category: "music" }, 50),
        makeEvent({ id: "evt_less_popular", category: "music" }, 5),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items.map((item) => item.id)).toEqual([
      "evt_popular",
      "evt_less_popular",
    ]);
  });

  it("TC-REC-MODEL-003: ranks nearer-future items ahead when interest match and popularity are tied", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent(
          {
            id: "evt_tomorrow",
            category: "tech",
            startAt: new Date("2099-04-01T12:00:00Z"),
          },
          10,
        ),
        makeEvent(
          {
            id: "evt_next_month",
            category: "tech",
            startAt: new Date("2099-05-01T12:00:00Z"),
          },
          10,
        ),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items.map((item) => item.id)).toEqual([
      "evt_tomorrow",
      "evt_next_month",
    ]);
  });

  it("TC-REC-MODEL-004: excludes events dismissed by the current user", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_keep", category: "music" }, 3),
        makeEvent({ id: "evt_dismissed", category: "music" }, 10),
      ] as never,
    );
    vi.mocked(mockPrisma.interaction.findMany).mockResolvedValue(
      [{ eventId: "evt_dismissed" }] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items.map((item) => item.id)).toEqual(["evt_keep"]);
  });

  it("TC-REC-MODEL-005: excludes past and completed events from the response", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_open_future", status: "OPEN" }, 1),
        makeEvent(
          {
            id: "evt_completed_past",
            status: "COMPLETED",
            startAt: new Date("2098-03-01T12:00:00Z"),
          },
          99,
        ),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items.map((item) => item.id)).toEqual(["evt_open_future"]);
  });

  it("TC-REC-MODEL-007: interest-matched event outranks a significantly more popular but unmatched event", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_matched", category: "music" }, 0),
        makeEvent({ id: "evt_very_popular", category: "sports" }, 100),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items.map((item) => item.id)).toEqual([
      "evt_matched",
      "evt_very_popular",
    ]);
  });

  it("TC-REC-MODEL-006: falls back to popularity ranking for a user with no interests and no interactions", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(
      { ...CURRENT_USER, interests: [] } as never,
    );
    vi.mocked(mockPrisma.interaction.count).mockResolvedValue(0 as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_popular" }, 40),
        makeEvent({ id: "evt_less_popular" }, 2),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string }>;
      meta: { rankingMode: string };
    };
    expect(body.items.map((item) => item.id)).toEqual([
      "evt_popular",
      "evt_less_popular",
    ]);
    expect(body.meta.rankingMode).toBe("POPULARITY_FALLBACK");
  });

  it("TC-FEED-001: returns a blended feed by default", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_event", type: "EVENT", category: "music" }, 10),
        makeEvent({ id: "evt_gig", type: "GIG", category: "tech" }, 9),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ type: string }> };
    expect(body.items.map((item) => item.type)).toEqual(["EVENT", "GIG"]);
  });

  it("TC-FEED-002: supports EVENT-only filtering", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_event", type: "EVENT", category: "music" }, 4),
        makeEvent({ id: "evt_gig", type: "GIG", category: "music" }, 8),
      ] as never,
    );

    const res = await app.request(
      makeAuthRequest("/api/v1/recommendations?type=EVENT"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ type: string }> };
    expect(body.items.every((item) => item.type === "EVENT")).toBe(true);
  });

  it("TC-FEED-003: supports GIG-only filtering", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_event", type: "EVENT", category: "music" }, 4),
        makeEvent({ id: "evt_gig", type: "GIG", category: "music" }, 8),
      ] as never,
    );

    const res = await app.request(
      makeAuthRequest("/api/v1/recommendations?type=GIG"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ type: string }> };
    expect(body.items.every((item) => item.type === "GIG")).toBe(true);
  });

  it("TC-FEED-004: paginates the ranked result set", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_1", category: "music" }, 9),
        makeEvent({ id: "evt_2", category: "music" }, 8),
        makeEvent({ id: "evt_3", category: "music" }, 7),
      ] as never,
    );

    const res = await app.request(
      makeAuthRequest("/api/v1/recommendations?limit=1&offset=1"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string }>;
      meta: { total: number; limit: number; offset: number };
    };
    expect(body.items.map((item) => item.id)).toEqual(["evt_2"]);
    expect(body.meta).toMatchObject({
      total: 3,
      limit: 1,
      offset: 1,
    });
  });

  it("TC-FEED-005: exposes fallback mode for a new user feed", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(
      { ...CURRENT_USER, interests: [] } as never,
    );
    vi.mocked(mockPrisma.interaction.count).mockResolvedValue(0 as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_1" }, 6),
        makeEvent({ id: "evt_2" }, 2),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string }>;
      meta: { rankingMode: string };
    };
    expect(body.items.map((item) => item.id)).toEqual(["evt_1", "evt_2"]);
    expect(body.meta.rankingMode).toBe("POPULARITY_FALLBACK");
  });
});

describe("[phase:6] [regression:always] Recommendation section endpoints", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: CURRENT_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(CURRENT_USER as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.interaction.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.interaction.count).mockResolvedValue(1 as never);
  });

  it("TC-FEED-007: orders the popular section by popularity then start time", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_most_popular_later" }, 30),
        makeEvent(
          {
            id: "evt_most_popular_earlier",
            startAt: new Date("2099-04-01T12:00:00Z"),
          },
          30,
        ),
        makeEvent({ id: "evt_less_popular" }, 5),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations/popular"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string }>;
      meta: { total: number; limit: number; offset: number };
    };
    expect(body.items.map((item) => item.id)).toEqual([
      "evt_most_popular_earlier",
      "evt_most_popular_later",
      "evt_less_popular",
    ]);
    expect(body.meta).toMatchObject({
      total: 3,
      limit: 20,
      offset: 0,
    });
  });

  it("TC-FEED-008: orders the upcoming section by start time then popularity", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_later_more_popular" }, 20),
        makeEvent(
          {
            id: "evt_soon_less_popular",
            startAt: new Date("2099-04-01T12:00:00Z"),
          },
          5,
        ),
        makeEvent(
          {
            id: "evt_same_time_more_popular",
            startAt: new Date("2099-04-01T12:00:00Z"),
          },
          15,
        ),
      ] as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/recommendations/upcoming"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items.map((item) => item.id)).toEqual([
      "evt_same_time_more_popular",
      "evt_soon_less_popular",
      "evt_later_more_popular",
    ]);
  });

  it("TC-FEED-009: popular and upcoming respect type filters", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_event", type: "EVENT", category: "music" }, 4),
        makeEvent({ id: "evt_gig", type: "GIG", category: "music" }, 8),
      ] as never,
    );

    const popularRes = await app.request(
      makeAuthRequest("/api/v1/recommendations/popular?type=EVENT"),
    );
    const upcomingRes = await app.request(
      makeAuthRequest("/api/v1/recommendations/upcoming?type=GIG"),
    );

    expect(popularRes.status).toBe(200);
    expect(upcomingRes.status).toBe(200);

    const popularBody = (await popularRes.json()) as {
      items: Array<{ type: string }>;
    };
    const upcomingBody = (await upcomingRes.json()) as {
      items: Array<{ type: string }>;
    };

    expect(popularBody.items.every((item) => item.type === "EVENT")).toBe(true);
    expect(upcomingBody.items.every((item) => item.type === "GIG")).toBe(true);
  });

  it("TC-FEED-010: popular and upcoming exclude dismissed and ineligible items", async () => {
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(
      [
        makeEvent({ id: "evt_keep", category: "music" }, 6),
        makeEvent({ id: "evt_dismissed", category: "music" }, 10),
        makeEvent(
          {
            id: "evt_past",
            startAt: new Date("2000-03-01T12:00:00Z"),
          },
          50,
        ),
        makeEvent(
          {
            id: "evt_cancelled",
            status: "CANCELLED",
          },
          50,
        ),
      ] as never,
    );
    vi.mocked(mockPrisma.interaction.findMany).mockResolvedValue(
      [{ eventId: "evt_dismissed" }] as never,
    );

    const popularRes = await app.request(
      makeAuthRequest("/api/v1/recommendations/popular"),
    );
    const upcomingRes = await app.request(
      makeAuthRequest("/api/v1/recommendations/upcoming"),
    );

    expect(popularRes.status).toBe(200);
    expect(upcomingRes.status).toBe(200);

    const popularBody = (await popularRes.json()) as {
      items: Array<{ id: string }>;
    };
    const upcomingBody = (await upcomingRes.json()) as {
      items: Array<{ id: string }>;
    };

    expect(popularBody.items.map((item) => item.id)).toEqual(["evt_keep"]);
    expect(upcomingBody.items.map((item) => item.id)).toEqual(["evt_keep"]);
  });
});
