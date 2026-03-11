import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrismaClient, getPrisma } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { gigs } from "../routes/gigs";

const OWNER = { id: "user_owner", clerkId: "clerk_owner", email: "owner@osu.edu" };
const APPLICANT_A = { id: "user_a", clerkId: "clerk_a", email: "a@osu.edu" };
const APPLICANT_B = { id: "user_b", clerkId: "clerk_b", email: "b@osu.edu" };

function createTestApp(user = OWNER) {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", user);
    await next();
  });
  app.route("/gigs", gigs);
  return app;
}

function getApplications(app: Hono, gigId: string, query = "") {
  return app.request(`/gigs/${gigId}/applications${query}`);
}

const GIG = { id: "gig_1", type: "GIG", creatorId: OWNER.id };

function makeApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: "app_1",
    gigId: GIG.id,
    applicantId: APPLICANT_A.id,
    message: "I'm interested",
    status: "PENDING",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    applicant: { id: APPLICANT_A.id, displayName: "User A", email: "a@osu.edu" },
    ...overrides,
  };
}

describe("[phase:2] [regression:always] GET /gigs/:gigId/applications", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("owner sees all applications for their gig", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);

    const apps = [
      makeApplication({ id: "app_1", applicantId: APPLICANT_A.id }),
      makeApplication({ id: "app_2", applicantId: APPLICANT_B.id }),
    ];
    vi.mocked(mockPrisma.application.findMany).mockResolvedValue(apps as never);
    vi.mocked(mockPrisma.application.count).mockResolvedValue(2 as never);

    const res = await getApplications(createTestApp(OWNER), GIG.id);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: unknown[]; pagination: { total: number } };
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);

    // Owner query should not filter by applicantId
    expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gigId: GIG.id } }),
    );
  });

  it("applicant sees only their own application", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);

    const ownApp = [makeApplication({ id: "app_1", applicantId: APPLICANT_A.id })];
    vi.mocked(mockPrisma.application.findMany).mockResolvedValue(ownApp as never);
    vi.mocked(mockPrisma.application.count).mockResolvedValue(1 as never);

    const res = await getApplications(createTestApp(APPLICANT_A), GIG.id);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: unknown[]; pagination: { total: number } };
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);

    // Non-owner query should filter by applicantId
    expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gigId: GIG.id, applicantId: APPLICANT_A.id } }),
    );
  });

  it("respects limit and offset pagination", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);
    vi.mocked(mockPrisma.application.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.application.count).mockResolvedValue(50 as never);

    const res = await getApplications(createTestApp(OWNER), GIG.id, "?limit=10&offset=20");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { pagination: { total: number; limit: number; offset: number } };
    expect(body.pagination).toEqual({ total: 50, limit: 10, offset: 20 });

    expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
  });

  it("clamps limit to max 100 and min 1", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);
    vi.mocked(mockPrisma.application.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.application.count).mockResolvedValue(0 as never);

    const res = await getApplications(createTestApp(OWNER), GIG.id, "?limit=999");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { pagination: { limit: number } };
    expect(body.pagination.limit).toBe(100);
  });

  it("returns 404 when gig does not exist", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);

    const res = await getApplications(createTestApp(OWNER), "nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns 400 when event is not a gig", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
      { id: "evt_1", type: "EVENT", creatorId: OWNER.id } as never,
    );

    const res = await getApplications(createTestApp(OWNER), "evt_1");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toBe("Event is not a gig");
  });
});
