import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClerkGetUser = vi.fn();

vi.mock("@hono/clerk-auth", () => ({
  clerkMiddleware: () =>
    async (
      c: { set: (key: string, value: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("clerk", { users: { getUser: mockClerkGetUser } });
      await next();
    },
  getAuth: vi.fn(),
}));

vi.mock("../lib/prisma");

import { getAuth } from "@hono/clerk-auth";
import { getPrismaClient, getPrisma } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { app } from "../index";
import { makeAuthRequest } from "./helpers/context";

const AUTH_USER = {
  id: "user_auth",
  clerkId: "clerk_auth",
  email: "viewer@osu.edu",
  displayName: "Viewer",
  major: null,
  gradYear: null,
  interests: [],
  followerCount: 0,
  followingCount: 0,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
};

const TARGET_USER = {
  id: "user_target",
  clerkId: "clerk_target",
  email: "brutus@osu.edu",
  displayName: "Brutus",
  major: "CS",
  gradYear: 2025,
  interests: ["sports"],
  followerCount: 10,
  followingCount: 5,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-02T00:00:00Z"),
};

const MOCK_EVENTS = [
  { id: "evt_1", title: "Open Event 1", status: "OPEN", creatorId: TARGET_USER.id },
  { id: "evt_2", title: "Open Event 2", status: "OPEN", creatorId: TARGET_USER.id },
];

describe("[phase:1] [regression:always] GET /api/v1/users/:id", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: AUTH_USER.clerkId } as never);

    // Auth middleware looks up by clerkId; route handler looks up by id
    vi.mocked(mockPrisma.user.findUnique).mockImplementation(
      ((args: { where: { clerkId?: string; id?: string } }) => {
        if (args?.where?.clerkId === AUTH_USER.clerkId)
          return Promise.resolve(AUTH_USER);
        if (args?.where?.id === TARGET_USER.id)
          return Promise.resolve(TARGET_USER);
        return Promise.resolve(null);
      }) as never
    );

    vi.mocked(mockPrisma.event.findMany).mockResolvedValue(MOCK_EVENTS as never);
    vi.mocked(mockPrisma.event.count).mockResolvedValue(2);
    vi.mocked(mockPrisma.follow.findUnique).mockResolvedValue(null);
  });

  it("TC-PUB-001: returns public profile fields for another user", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}`)
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toMatchObject({
      id: TARGET_USER.id,
      displayName: TARGET_USER.displayName,
      major: TARGET_USER.major,
      gradYear: TARGET_USER.gradYear,
      interests: TARGET_USER.interests,
      followerCount: TARGET_USER.followerCount,
      followingCount: TARGET_USER.followingCount,
    });
    expect(data).toHaveProperty("isFollowing");
    expect(data).toHaveProperty("createdEvents");
  });

  it("TC-PUB-002: email is not included in public profile", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}`)
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).not.toHaveProperty("email");
  });

  it("TC-PUB-003: only OPEN and IN_PROGRESS events are included", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}`)
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    const createdEvents = data.createdEvents as { items: unknown[]; meta: Record<string, unknown> };
    expect(createdEvents.items).toHaveLength(2);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          creatorId: TARGET_USER.id,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        }),
      })
    );
  });

  it("TC-PUB-004: isFollowing is true when authenticated user follows target", async () => {
    vi.mocked(mockPrisma.follow.findUnique).mockResolvedValue({
      id: "follow_1",
      followerId: AUTH_USER.id,
      followeeId: TARGET_USER.id,
      createdAt: new Date(),
    } as never);

    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}`)
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.isFollowing).toBe(true);
  });

  it("TC-PUB-005: isFollowing is false when authenticated user does not follow target", async () => {
    vi.mocked(mockPrisma.follow.findUnique).mockResolvedValue(null);

    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}`)
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.isFollowing).toBe(false);
  });

  it("TC-PUB-006: returns 404 for nonexistent user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockImplementation(
      ((args: { where: { clerkId?: string; id?: string } }) => {
        if (args?.where?.clerkId === AUTH_USER.clerkId)
          return Promise.resolve(AUTH_USER);
        return Promise.resolve(null);
      }) as never
    );

    const res = await app.request(
      makeAuthRequest("/api/v1/users/nonexistent")
    );

    expect(res.status).toBe(404);
  });

  it("TC-PUB-006: 404 response uses RFC 7807 Problem Details format", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockImplementation(
      ((args: { where: { clerkId?: string; id?: string } }) => {
        if (args?.where?.clerkId === AUTH_USER.clerkId)
          return Promise.resolve(AUTH_USER);
        return Promise.resolve(null);
      }) as never
    );

    const res = await app.request(
      makeAuthRequest("/api/v1/users/nonexistent")
    );

    expect(res.status).toBe(404);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
    });
    expect(data).toHaveProperty("detail");
  });

  it("excludes clerkId and updatedAt from public profile", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}`)
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).not.toHaveProperty("clerkId");
    expect(data).not.toHaveProperty("updatedAt");
  });

  it("respects pagination query params for createdEvents", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}?limit=5&offset=10`)
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        skip: 10,
      })
    );
    const data = (await res.json()) as Record<string, unknown>;
    const createdEvents = data.createdEvents as { items: unknown[]; meta: Record<string, unknown> };
    expect(createdEvents.meta).toMatchObject({ limit: 5, offset: 10 });
  });

  it("caps limit at 100", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}?limit=999`)
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("TC-PUB-008: returns 400 for non-numeric limit", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}?limit=abc`)
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toMatchObject({
      type: expect.stringContaining("invalid-query"),
      title: "Invalid query parameter",
      status: 400,
    });
  });

  it("TC-PUB-008: returns 400 for non-numeric offset", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}?offset=xyz`)
    );

    expect(res.status).toBe(400);
  });

  it("TC-PUB-008: returns 400 when both limit and offset are non-numeric", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}?limit=abc&offset=xyz`)
    );

    expect(res.status).toBe(400);
  });

  it("uses defaults when limit and offset are omitted", async () => {
    const res = await app.request(
      makeAuthRequest(`/api/v1/users/${TARGET_USER.id}`)
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
  });
});
