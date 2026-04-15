import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClerkGetUser = vi.fn();
const mockListRecentEventPipelineJobs = vi.fn();
const mockCreateEventPipelineJob = vi.fn();
const mockCreateEmbeddingBackfillJob = vi.fn();

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
vi.mock("../services/event-pipeline", () => ({
  listRecentEventPipelineJobs: (...args: unknown[]) =>
    mockListRecentEventPipelineJobs(...args),
  createEventPipelineJob: (...args: unknown[]) =>
    mockCreateEventPipelineJob(...args),
  createEmbeddingBackfillJob: (...args: unknown[]) =>
    mockCreateEmbeddingBackfillJob(...args),
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
  AI_ROUTER_CONFIG_JSON: JSON.stringify({}),
};

describe("[phase:6] [regression:always] Admin AI pipeline endpoints", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: BASE_USER.clerkId } as never);
  });

  it("TC-DBG-015: returns 403 for a non-admin user when listing pipeline jobs", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "USER",
    } as never);

    const res = await app.request(
      "/api/v1/admin/ai-pipeline/jobs",
      {
        headers: { Authorization: "Bearer test-token" },
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(403);
    expect(mockListRecentEventPipelineJobs).not.toHaveBeenCalled();
  });

  it("TC-AUTHZ-015: returns 403 for a non-admin user when rerunning the AI pipeline", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "USER",
    } as never);

    const res = await app.request(
      "/api/v1/admin/ai-pipeline/events/evt_1/rerun",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: "FULL_PIPELINE" }),
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(403);
    expect(mockCreateEventPipelineJob).not.toHaveBeenCalled();
  });

  it("TC-AUTHZ-016: returns 403 for a non-admin user when starting an embedding backfill", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "USER",
    } as never);

    const res = await app.request(
      "/api/v1/admin/ai-pipeline/backfill",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(403);
    expect(mockCreateEmbeddingBackfillJob).not.toHaveBeenCalled();
  });

  it("TC-DBG-016: returns recent pipeline jobs for an admin user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "ADMIN",
    } as never);
    mockListRecentEventPipelineJobs.mockResolvedValue([
      {
        id: "job_1",
        trigger: "EVENT_CREATE",
        status: "SUCCEEDED",
        stages: ["TAGGING", "EMBEDDING"],
        runs: [
          {
            id: "run_1",
            eventId: "evt_1",
            stage: "EMBEDDING",
            status: "SUCCEEDED",
          },
        ],
      },
    ]);

    const res = await app.request(
      "/api/v1/admin/ai-pipeline/jobs",
      {
        headers: { Authorization: "Bearer test-token" },
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(200);
    expect(mockListRecentEventPipelineJobs).toHaveBeenCalledWith(mockPrisma, {
      limit: 10,
    });
    expect(await res.json()).toMatchObject([
      {
        id: "job_1",
        trigger: "EVENT_CREATE",
        status: "SUCCEEDED",
      },
    ]);
  });

  it("TC-DBG-017: creates a rerun job for an admin user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "ADMIN",
    } as never);
    mockCreateEventPipelineJob.mockResolvedValue({
      id: "job_rerun_1",
      trigger: "ADMIN_RERUN",
      status: "QUEUED",
    });

    const res = await app.request(
      "/api/v1/admin/ai-pipeline/events/evt_1/rerun",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: "FULL_PIPELINE" }),
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(202);
    expect(mockCreateEventPipelineJob).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        eventIds: ["evt_1"],
        stages: ["TAGGING", "EMBEDDING"],
        trigger: "ADMIN_RERUN",
        requestedByUserId: BASE_USER.id,
      }),
    );
  });

  it("TC-DBG-018: creates a backfill job for an admin user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      role: "ADMIN",
    } as never);
    mockCreateEmbeddingBackfillJob.mockResolvedValue({
      id: "job_backfill_1",
      trigger: "EMBEDDING_BACKFILL",
      status: "QUEUED",
    });

    const res = await app.request(
      "/api/v1/admin/ai-pipeline/backfill",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      },
      TEST_ENV as never,
    );

    expect(res.status).toBe(202);
    expect(mockCreateEmbeddingBackfillJob).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        requestedByUserId: BASE_USER.id,
      }),
    );
  });
});
