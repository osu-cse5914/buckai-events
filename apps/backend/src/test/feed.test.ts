import { describe, it, expect, vi, beforeEach } from "vitest";

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
import { getPrismaClient, getPrisma } from "../lib/prisma";
import { buildSocialFeedItem, buildUser } from "./factories";
import { createMockPrisma } from "./helpers/prisma";
import { app } from "../index";
import { makeAuthRequest } from "./helpers/context";

const FULL_USER = buildUser({
  id: "user_a",
  clerkId: "clerk_a",
  email: "usera@osu.edu",
  displayName: "User A",
  interests: [],
  followerCount: 1,
  followingCount: 1,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-02T00:00:00Z"),
});

const makeFeedItem = buildSocialFeedItem;

describe("[phase:3] [regression:always] GET /api/v1/social/feed", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER as never);
  });

  it("TC-SFEED-001: returns events created by followed users", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([
        makeFeedItem({
          action: "created",
          actor: { id: "user_b", displayName: "User B" },
          event: {
            id: "evt_created",
            title: "Open Mic Night",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
        }),
      ] as never)
      .mockResolvedValueOnce([{ total: 1 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{
        action: string;
        actor: { id: string; displayName: string };
        event: { id: string; title: string };
      }>;
      pagination: { total: number; limit: number; offset: number };
    };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      action: "created",
      actor: { id: "user_b", displayName: "User B" },
      event: { id: "evt_created", title: "Open Mic Night" },
    });
    expect(body.pagination.total).toBe(1);
  });

  it("TC-SFEED-002: returns events saved to PUBLIC collections by followed users", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([
        makeFeedItem({
          action: "saved",
          actor: { id: "user_b", displayName: "User B" },
          event: {
            id: "evt_saved",
            title: "Career Fair",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
        }),
      ] as never)
      .mockResolvedValueOnce([{ total: 1 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ action: string; event: { id: string; title: string } }>;
    };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      action: "saved",
      event: { id: "evt_saved", title: "Career Fair" },
    });
  });

  it("TC-SFEED-003: excludes saves from PRIVATE collections", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<unknown>;
      pagination: { total: number };
    };

    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("TC-SFEED-004: orders feed items by action timestamp descending", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([
        makeFeedItem({
          event: {
            id: "evt_2",
            title: "Later saved event",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
          action: "saved",
          actor: { id: "user_c", displayName: "User C" },
          actionAt: "2026-03-02T12:00:00.000Z",
        }),
        makeFeedItem({
          event: {
            id: "evt_1",
            title: "Earlier created event",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
          action: "created",
          actor: { id: "user_b", displayName: "User B" },
          actionAt: "2026-03-01T12:00:00.000Z",
        }),
      ] as never)
      .mockResolvedValueOnce([{ total: 2 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ event: { id: string }; actionAt: string }>;
    };

    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({
      event: { id: "evt_2" },
      actionAt: "2026-03-02T12:00:00.000Z",
    });
    expect(body.data[1]).toMatchObject({
      event: { id: "evt_1" },
      actionAt: "2026-03-01T12:00:00.000Z",
    });
  });

  it("TC-SFEED-005: returns an empty feed when the user follows nobody", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<unknown>;
      pagination: { total: number; limit: number; offset: number };
    };

    expect(body.data).toEqual([]);
    expect(body.pagination).toEqual({ total: 0, limit: 20, offset: 0 });
  });

  it("TC-SFEED-006: supports limit and offset pagination", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([
        makeFeedItem({
          event: {
            id: "evt_11",
            title: "Item 11",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
        }),
        makeFeedItem({
          event: {
            id: "evt_12",
            title: "Item 12",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
        }),
      ] as never)
      .mockResolvedValueOnce([{ total: 50 }] as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/social/feed?limit=10&offset=10"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ event: { id: string } }>;
      pagination: { total: number; limit: number; offset: number };
    };

    expect(body.data).toHaveLength(2);
    expect(body.data[0]?.event.id).toBe("evt_11");
    expect(body.pagination).toEqual({ total: 50, limit: 10, offset: 10 });
  });

  it("TC-SFEED-007: no longer returns an unfollowed user's events", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<unknown> };

    expect(body.data).toEqual([]);
  });

  it("TC-SFEED-008: emits one created item when the same actor created and saved the same event", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([
        makeFeedItem({
          event: {
            id: "evt_same",
            title: "Hack Night",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
          action: "created",
          actor: { id: "user_b", displayName: "User B" },
          actionAt: "2026-03-01T12:00:00.000Z",
        }),
        makeFeedItem({
          event: {
            id: "evt_same",
            title: "Hack Night",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
          action: "saved",
          actor: { id: "user_b", displayName: "User B" },
          actionAt: "2026-03-01T13:00:00.000Z",
        }),
      ] as never)
      .mockResolvedValueOnce([{ total: 2 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{
        action: string;
        actor: { id: string };
        event: { id: string };
      }>;
    };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      action: "created",
      actor: { id: "user_b" },
      event: { id: "evt_same" },
    });
  });

  it("TC-SFEED-009: deduplicates multiple PUBLIC saves of the same event and keeps the most recent save time", async () => {
    vi.mocked(mockPrisma.$queryRaw)
      .mockResolvedValueOnce([
        makeFeedItem({
          event: {
            id: "evt_saved_twice",
            title: "Career Fair",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
          action: "saved",
          actor: { id: "user_b", displayName: "User B" },
          actionAt: "2026-03-01T15:00:00.000Z",
        }),
        makeFeedItem({
          event: {
            id: "evt_saved_twice",
            title: "Career Fair",
            source: "USER",
            type: "EVENT",
            status: "OPEN",
          },
          action: "saved",
          actor: { id: "user_b", displayName: "User B" },
          actionAt: "2026-03-01T14:00:00.000Z",
        }),
      ] as never)
      .mockResolvedValueOnce([{ total: 2 }] as never);

    const res = await app.request(makeAuthRequest("/api/v1/social/feed"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{
        action: string;
        actor: { id: string };
        event: { id: string };
        actionAt: string;
      }>;
    };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      action: "saved",
      actor: { id: "user_b" },
      event: { id: "evt_saved_twice" },
      actionAt: "2026-03-01T15:00:00.000Z",
    });
  });
});
