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
import { createMockPrisma } from "./helpers/prisma";
import { app } from "../index";
import { makeAuthRequest } from "./helpers/context";

const FULL_USER = {
  id: "user_1",
  clerkId: "clerk_abc123",
  email: "student@osu.edu",
  displayName: "Brutus",
  interests: [],
  followerCount: 0,
  followingCount: 0,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-02T00:00:00Z"),
};

function makeApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: "app_1",
    gigId: "gig_1",
    applicantId: FULL_USER.id,
    message: "I'm interested",
    status: "PENDING",
    createdAt: new Date("2026-03-01T12:00:00Z"),
    updatedAt: new Date("2026-03-01T12:00:00Z"),
    gig: {
      id: "gig_1",
      title: "Need a tutor",
      status: "OPEN",
      startAt: new Date("2026-03-20T14:00:00Z"),
      locationName: "Thompson Library",
    },
    ...overrides,
  };
}

describe("[phase:2] [regression:always] GET /api/v1/users/me/applications", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER as never);
  });

  it("TC-APP-014: returns the authenticated user's applications with gig summaries", async () => {
    const applications = [
      makeApplication({
        id: "app_2",
        status: "ACCEPTED",
        createdAt: new Date("2026-03-03T12:00:00Z"),
        gig: {
          id: "gig_2",
          title: "Research assistant",
          status: "OPEN",
          startAt: new Date("2026-03-22T09:00:00Z"),
          locationName: "Dreese Labs",
        },
      }),
      makeApplication(),
    ];

    vi.mocked(mockPrisma.application.findMany).mockResolvedValue(
      applications as never,
    );
    vi.mocked(mockPrisma.application.count).mockResolvedValue(2 as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me/applications?limit=10&offset=0"),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      data: Array<{
        id: string;
        status: string;
        gig: { id: string; title: string };
      }>;
      pagination: { total: number; limit: number; offset: number };
    };

    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toMatchObject({
      id: "app_2",
      status: "ACCEPTED",
      gig: { id: "gig_2", title: "Research assistant" },
    });
    expect(data.pagination).toEqual({ total: 2, limit: 10, offset: 0 });
    expect(mockPrisma.application.findMany).toHaveBeenCalledWith({
      where: { applicantId: FULL_USER.id },
      include: {
        gig: {
          select: {
            id: true,
            title: true,
            status: true,
            startAt: true,
            locationName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 0,
    });
  });
});
