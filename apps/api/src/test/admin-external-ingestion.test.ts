import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClerkGetUser = vi.fn();
const mockSyncExternalEvents = vi.fn();

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
vi.mock("../services/external-ingestion", () => ({
  syncExternalEvents: (...args: unknown[]) => mockSyncExternalEvents(...args),
}));

import { getAuth } from "@hono/clerk-auth";
import { getPrisma, getPrismaClient } from "../lib/prisma";
import { app } from "../index";
import { createMockPrisma } from "./helpers/prisma";

const BASE_USER = {
  id: "user_1",
  clerkId: "clerk_admin_test",
  email: "admin-test@osu.edu",
};

const TEST_ENV = {
  DATABASE_URL: "postgresql://test-db",
  CLERK_SECRET_KEY: "clerk_test_secret",
  TICKETMASTER_API_KEY: "ticketmaster_test_key",
};

describe("[phase:6] [regression:always] POST /api/v1/admin/external-ingestion/sync", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: BASE_USER.clerkId } as never);
  });

  it("TC-AUTHZ-013: returns 403 for a non-admin user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "USER",
    } as never);

    const res = await app.request(
      "/api/v1/admin/external-ingestion/sync",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("forbidden"),
      title: "Forbidden",
      status: 403,
    });
    expect(mockSyncExternalEvents).not.toHaveBeenCalled();
  });

  it("TC-AUTHZ-014: returns 200 and invokes the sync service for an admin user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "ADMIN",
    } as never);
    mockSyncExternalEvents.mockResolvedValue({
      startedAt: new Date("2026-03-31T12:00:00.000Z"),
      finishedAt: new Date("2026-03-31T12:00:02.000Z"),
      sources: {
        osu: { fetched: 3, created: 1, updated: 1, skipped: 1, completed: 0 },
        ticketmaster: { fetched: 2, created: 1, updated: 0, skipped: 1, completed: 0 },
      },
    });

    const res = await app.request(
      "/api/v1/admin/external-ingestion/sync",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(200);
    expect(mockSyncExternalEvents).toHaveBeenCalledWith(mockPrisma, {
      ticketmasterApiKey: "ticketmaster_test_key",
    });
    expect(await res.json()).toMatchObject({
      startedAt: "2026-03-31T12:00:00.000Z",
      finishedAt: "2026-03-31T12:00:02.000Z",
      sources: {
        osu: { fetched: 3, created: 1, updated: 1, skipped: 1, completed: 0 },
        ticketmaster: { fetched: 2, created: 1, updated: 0, skipped: 1, completed: 0 },
      },
    });
  });

  it("returns RFC 7807 problem details when the sync service fails", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "ADMIN",
    } as never);
    mockSyncExternalEvents.mockRejectedValue(new Error("Ticketmaster timeout"));

    const res = await app.request(
      "/api/v1/admin/external-ingestion/sync",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("internal-error"),
      title: "Internal server error",
      status: 500,
      detail: "Ticketmaster timeout",
    });
  });
});
