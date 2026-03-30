import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrismaClient, getPrisma } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { gigs } from "../routes/gigs";

// --- Test data ---

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

function patchApplication(
  app: Hono,
  gigId: string,
  appId: string,
  body: Record<string, unknown>,
) {
  return app.request(`/gigs/${gigId}/applications/${appId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postApplication(
  app: Hono,
  gigId: string,
  body?: Record<string, unknown>,
) {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return app.request(`/gigs/${gigId}/applications`, init);
}

const GIG = { id: "gig_1", type: "GIG", status: "OPEN", creatorId: OWNER.id };

function makeGig(overrides: Record<string, unknown> = {}) {
  return {
    id: "gig_1",
    title: "Need a tutor",
    description: "Calculus tutor needed",
    type: "GIG",
    source: "USER",
    status: "OPEN",
    creatorId: OWNER.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: "app_1",
    gigId: GIG.id,
    applicantId: APPLICANT_A.id,
    message: "I'm interested",
    status: "PENDING",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    applicant: { id: APPLICANT_A.id, displayName: "User A", email: "a@osu.edu" },
    ...overrides,
  };
}

// --- Tests ---

describe("[phase:2] [regression:always] Gig Applications API", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  // ===========================================================================
  // POST /gigs/:gigId/applications (#56)
  // ===========================================================================
  describe("POST /:gigId/applications (#56)", () => {
    // S-APP-1 → TC-APP-001
    it("TC-APP-001: creates application with status PENDING and APPLY interaction", async () => {
      const gig = makeGig();
      const application = makeApplication();

      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(gig as never);
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        null as never,
      );
      vi.mocked(mockPrisma.application.create).mockResolvedValue(
        application as never,
      );
      vi.mocked(mockPrisma.interaction.create).mockResolvedValue({} as never);

      const res = await postApplication(createTestApp(APPLICANT_A), "gig_1", {
        message: "I'm interested",
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe("app_1");
      expect(body.status).toBe("PENDING");
      expect(body.applicantId).toBe(APPLICANT_A.id);
      expect(body.gigId).toBe("gig_1");

      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: {
          gigId: "gig_1",
          applicantId: APPLICANT_A.id,
          message: "I'm interested",
          status: "PENDING",
        },
      });
      expect(mockPrisma.interaction.create).toHaveBeenCalledWith({
        data: {
          userId: APPLICANT_A.id,
          eventId: "gig_1",
          action: "APPLY",
        },
      });
    });

    it("TC-APP-013: still creates the application when APPLY interaction persistence fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const gig = makeGig();
      const application = makeApplication();

      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(gig as never);
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        null as never,
      );
      vi.mocked(mockPrisma.application.create).mockResolvedValue(
        application as never,
      );
      vi.mocked(mockPrisma.interaction.create).mockRejectedValue(
        new Error("interaction write failed"),
      );

      const res = await postApplication(createTestApp(APPLICANT_A), "gig_1", {
        message: "I'm interested",
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe("app_1");
      expect(body.status).toBe("PENDING");
      expect(mockPrisma.application.create).toHaveBeenCalled();
      expect(mockPrisma.interaction.create).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it("returns 404 when gig does not exist", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);

      const res = await postApplication(
        createTestApp(APPLICANT_A),
        "nonexistent",
      );

      expect(res.status).toBe(404);
      expect(mockPrisma.application.create).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Application validation rules (#59)
  // ===========================================================================
  describe("POST /:gigId/applications — validation (#59)", () => {
    // S-APP-2 → TC-APP-002
    it("TC-APP-002: cannot apply to own gig (403)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeGig() as never,
      );

      const res = await postApplication(createTestApp(OWNER), "gig_1");

      expect(res.status).toBe(403);
      expect(mockPrisma.application.create).not.toHaveBeenCalled();
    });

    // S-APP-3 → TC-APP-003
    it("TC-APP-003: cannot apply twice (409)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeGig() as never,
      );
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        makeApplication() as never,
      );

      const res = await postApplication(
        createTestApp(APPLICANT_A),
        "gig_1",
      );

      expect(res.status).toBe(409);
      expect(mockPrisma.application.create).not.toHaveBeenCalled();
    });

    // S-APP-7 → TC-APP-007
    it("TC-APP-007: cannot apply to non-gig event (400)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeGig({ type: "EVENT" }) as never,
      );

      const res = await postApplication(
        createTestApp(APPLICANT_A),
        "gig_1",
      );

      expect(res.status).toBe(400);
      expect(mockPrisma.application.create).not.toHaveBeenCalled();
    });

    // S-APP-8 → TC-APP-008
    it("TC-APP-008: cannot apply to cancelled gig (400)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeGig({ status: "CANCELLED" }) as never,
      );

      const res = await postApplication(
        createTestApp(APPLICANT_A),
        "gig_1",
      );

      expect(res.status).toBe(400);
      expect(mockPrisma.application.create).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // GET /gigs/:gigId/applications (#57)
  // ===========================================================================
  describe("GET /:gigId/applications (#57)", () => {
    it("TC-AUTHZ-005: owner sees all applications for their gig", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);

      const apps = [
        makeApplication({ id: "app_1", applicantId: APPLICANT_A.id }),
        makeApplication({ id: "app_2", applicantId: APPLICANT_B.id }),
      ];
      vi.mocked(mockPrisma.application.findMany).mockResolvedValue(
        apps as never,
      );
      vi.mocked(mockPrisma.application.count).mockResolvedValue(2 as never);

      const res = await getApplications(createTestApp(OWNER), GIG.id);
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: unknown[];
        pagination: { total: number };
      };
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(2);

      // Owner query should not filter by applicantId
      expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { gigId: GIG.id } }),
      );
    });

    it("TC-AUTHZ-007: applicant sees only their own application", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        makeApplication({ id: "app_1", applicantId: APPLICANT_A.id }) as never,
      );

      const ownApp = [
        makeApplication({ id: "app_1", applicantId: APPLICANT_A.id }),
      ];
      vi.mocked(mockPrisma.application.findMany).mockResolvedValue(
        ownApp as never,
      );
      vi.mocked(mockPrisma.application.count).mockResolvedValue(1 as never);

      const res = await getApplications(
        createTestApp(APPLICANT_A),
        GIG.id,
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        data: unknown[];
        pagination: { total: number };
      };
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);

      // Non-owner query should filter by applicantId
      expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { gigId: GIG.id, applicantId: APPLICANT_A.id },
        }),
      );
    });

    it("TC-AUTHZ-006: non-owner who has not applied cannot view gig applications", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        null as never,
      );

      const res = await getApplications(createTestApp(APPLICANT_B), GIG.id);

      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({
        type: expect.stringContaining("forbidden"),
        title: "Forbidden",
        status: 403,
        detail: "Only the gig owner or an applicant can view applications",
      });
      expect(mockPrisma.application.findMany).not.toHaveBeenCalled();
    });

    it("respects limit and offset pagination", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);
      vi.mocked(mockPrisma.application.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(mockPrisma.application.count).mockResolvedValue(50 as never);

      const res = await getApplications(
        createTestApp(OWNER),
        GIG.id,
        "?limit=10&offset=20",
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        pagination: { total: number; limit: number; offset: number };
      };
      expect(body.pagination).toEqual({ total: 50, limit: 10, offset: 20 });

      expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });

    it("clamps limit to max 100 and min 1", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(GIG as never);
      vi.mocked(mockPrisma.application.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(mockPrisma.application.count).mockResolvedValue(0 as never);

      const res = await getApplications(
        createTestApp(OWNER),
        GIG.id,
        "?limit=999",
      );
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

  // ===========================================================================
  // PATCH /gigs/:gigId/applications/:appId
  // ===========================================================================
  describe("PATCH /:gigId/applications/:appId", () => {
    // S-APP-4 → TC-APP-004
    it("TC-APP-004: accept a PENDING application", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeGig() as never,
      );
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        makeApplication({ status: "PENDING" }) as never,
      );
      vi.mocked(mockPrisma.application.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(mockPrisma.application.findUniqueOrThrow).mockResolvedValue(
        makeApplication({ status: "ACCEPTED" }) as never,
      );

      const res = await patchApplication(
        createTestApp(OWNER),
        "gig_1",
        "app_1",
        { status: "ACCEPTED" },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("ACCEPTED");
    });

    // S-APP-5 → TC-APP-005
    it("TC-APP-005: reject a PENDING application", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeGig() as never,
      );
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        makeApplication({ status: "PENDING" }) as never,
      );
      vi.mocked(mockPrisma.application.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(mockPrisma.application.findUniqueOrThrow).mockResolvedValue(
        makeApplication({ status: "REJECTED" }) as never,
      );

      const res = await patchApplication(
        createTestApp(OWNER),
        "gig_1",
        "app_1",
        { status: "REJECTED" },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("REJECTED");
    });

    // S-APP-6 → TC-APP-006
    it("TC-APP-006: accept multiple applicants independently", async () => {
      const gig = makeGig();
      const appB = makeApplication({
        id: "app_b",
        applicantId: APPLICANT_A.id,
        status: "PENDING",
      });
      const appC = makeApplication({
        id: "app_c",
        applicantId: APPLICANT_B.id,
        status: "PENDING",
      });

      // Accept applicant A
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(gig as never);
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        appB as never,
      );
      vi.mocked(mockPrisma.application.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(mockPrisma.application.findUniqueOrThrow).mockResolvedValue(
        makeApplication({ id: "app_b", status: "ACCEPTED" }) as never,
      );

      const resB = await patchApplication(
        createTestApp(OWNER),
        "gig_1",
        "app_b",
        { status: "ACCEPTED" },
      );
      expect(resB.status).toBe(200);
      expect(
        ((await resB.json()) as Record<string, unknown>).status,
      ).toBe("ACCEPTED");

      // Accept applicant B
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        appC as never,
      );
      vi.mocked(mockPrisma.application.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(mockPrisma.application.findUniqueOrThrow).mockResolvedValue(
        makeApplication({ id: "app_c", status: "ACCEPTED" }) as never,
      );

      const resC = await patchApplication(
        createTestApp(OWNER),
        "gig_1",
        "app_c",
        { status: "ACCEPTED" },
      );
      expect(resC.status).toBe(200);
      expect(
        ((await resC.json()) as Record<string, unknown>).status,
      ).toBe("ACCEPTED");
    });

    // S-APP-9 → TC-APP-009
    it("TC-APP-009: cannot change status of non-PENDING application (400)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeGig() as never,
      );
      vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(
        makeApplication({ status: "ACCEPTED" }) as never,
      );

      const res = await patchApplication(
        createTestApp(OWNER),
        "gig_1",
        "app_1",
        { status: "REJECTED" },
      );

      expect(res.status).toBe(400);
      expect(mockPrisma.application.updateMany).not.toHaveBeenCalled();
    });
  });
});
