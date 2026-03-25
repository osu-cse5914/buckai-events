import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

import { getPrismaClient, getPrisma } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { events, isValidStatusTransition } from "../routes/events";

// --- Test data ---

const USER_A = { id: "user_a", clerkId: "clerk_a", email: "usera@osu.edu" };
const USER_B = { id: "user_b", clerkId: "clerk_b", email: "userb@osu.edu" };

function createTestApp(user = USER_A) {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", user);
    await next();
  });
  app.route("/events", events);
  return app;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Hackathon",
    description: "24hr hackathon",
    summary: null,
    type: "EVENT",
    source: "USER",
    externalId: null,
    category: null,
    tags: [],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: new Date("2025-04-01T09:00:00Z"),
    endAt: null,
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    status: "OPEN",
    creatorId: USER_A.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function postEvent(app: Hono, body: Record<string, unknown>) {
  return app.request("/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchEvent(app: Hono, id: string, body: Record<string, unknown>) {
  return app.request(`/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe("[phase:1] [regression:always] Event CRUD API", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  // =====================================================================
  // Issue #42 — Status transition validation
  // =====================================================================
  describe("isValidStatusTransition (#42)", () => {
    it("allows OPEN → IN_PROGRESS", () => {
      expect(isValidStatusTransition("OPEN", "IN_PROGRESS")).toBe(true);
    });

    it("allows OPEN → CANCELLED", () => {
      expect(isValidStatusTransition("OPEN", "CANCELLED")).toBe(true);
    });

    it("allows IN_PROGRESS → COMPLETED", () => {
      expect(isValidStatusTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    });

    it("rejects COMPLETED → OPEN", () => {
      expect(isValidStatusTransition("COMPLETED", "OPEN")).toBe(false);
    });

    it("rejects CANCELLED → OPEN", () => {
      expect(isValidStatusTransition("CANCELLED", "OPEN")).toBe(false);
    });

    it("rejects OPEN → COMPLETED (must go through IN_PROGRESS)", () => {
      expect(isValidStatusTransition("OPEN", "COMPLETED")).toBe(false);
    });

    it("rejects IN_PROGRESS → CANCELLED", () => {
      expect(isValidStatusTransition("IN_PROGRESS", "CANCELLED")).toBe(false);
    });

    it("rejects COMPLETED → CANCELLED", () => {
      expect(isValidStatusTransition("COMPLETED", "CANCELLED")).toBe(false);
    });

    it("rejects CANCELLED → COMPLETED", () => {
      expect(isValidStatusTransition("CANCELLED", "COMPLETED")).toBe(false);
    });
  });

  // =====================================================================
  // Issue #37 — POST /api/v1/events
  // =====================================================================
  describe("POST /events (#37)", () => {
    const validEvent = {
      title: "Hackathon",
      description: "24hr hackathon",
      type: "EVENT",
      location: { name: "Ohio Union" },
      startAt: "2025-04-01T09:00:00Z",
    };

    // S-EVT-1 → TC-EVT-001
    it("TC-EVT-001: creates an event with status OPEN, source USER, creatorId set", async () => {
      const created = makeEvent();
      vi.mocked(mockPrisma.event.create).mockResolvedValue(created as never);

      const res = await postEvent(createTestApp(), validEvent);

      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe("evt_1");
      expect(body.status).toBe("OPEN");
      expect(body.source).toBe("USER");
      expect(mockPrisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Hackathon",
            description: "24hr hackathon",
            type: "EVENT",
            source: "USER",
            status: "OPEN",
            creatorId: USER_A.id,
            locationName: "Ohio Union",
            tags: [],
            summary: null,
            category: null,
          }),
        }),
      );
    });

    // S-EVT-2 → TC-EVT-002
    it("TC-EVT-002: creates a gig with compensation fields", async () => {
      const gig = makeEvent({
        type: "GIG",
        title: "Need a tutor",
        description: "Calculus tutor needed",
        compensationAmount: 25,
        compensationCurrency: "USD",
        compensationType: "HOURLY",
      });
      vi.mocked(mockPrisma.event.create).mockResolvedValue(gig as never);

      const res = await postEvent(createTestApp(), {
        title: "Need a tutor",
        description: "Calculus tutor needed",
        type: "GIG",
        location: { name: "Thompson Library" },
        startAt: "2025-04-05T14:00:00Z",
        compensation: { amount: 25, currency: "USD", type: "HOURLY" },
      });

      expect(res.status).toBe(201);
      expect(mockPrisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "GIG",
            compensationAmount: 25,
            compensationCurrency: "USD",
            compensationType: "HOURLY",
          }),
        }),
      );
    });

    // S-EVT-13 → TC-EVT-013: AI tagging failure does not block creation
    it("TC-EVT-013: event created with tags=[], summary=null, category=null (no AI)", async () => {
      const created = makeEvent();
      vi.mocked(mockPrisma.event.create).mockResolvedValue(created as never);

      const res = await postEvent(createTestApp(), validEvent);

      expect(res.status).toBe(201);
      expect(mockPrisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: [],
            summary: null,
            category: null,
          }),
        }),
      );
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await postEvent(createTestApp(), { title: "Incomplete" });
      expect(res.status).toBe(400);
      expect(mockPrisma.event.create).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid event type", async () => {
      const res = await postEvent(createTestApp(), {
        ...validEvent,
        type: "INVALID",
      });
      expect(res.status).toBe(400);
      expect(mockPrisma.event.create).not.toHaveBeenCalled();
    });

    it("TC-EVT-021: rejects invalid create payload dates and compensation type", async () => {
      const invalidBodies = [
        {
          ...validEvent,
          startAt: "not-a-date",
        },
        {
          ...validEvent,
          endAt: "not-a-date",
        },
        {
          ...validEvent,
          type: "GIG",
          compensation: { amount: 25, currency: "USD", type: "INVALID" },
        },
      ];

      for (const body of invalidBodies) {
        const res = await postEvent(createTestApp(), body);

        expect(res.status).toBe(400);
        expect(mockPrisma.event.create).not.toHaveBeenCalled();
      }
    });
  });

  // =====================================================================
  // Issue #39 — GET /api/v1/events/:id
  // =====================================================================
  describe("GET /events/:id (#39)", () => {
    // S-EVT-3 → TC-EVT-003
    it("TC-EVT-003: returns full event details including creator", async () => {
      const event = makeEvent({
        creator: { id: USER_A.id, displayName: null, email: USER_A.email },
      });
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(event as never);

      const res = await createTestApp().request("/events/evt_1");

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe("evt_1");
      expect(body.title).toBe("Hackathon");
      expect(body.creator).toEqual({
        id: USER_A.id,
        displayName: null,
        email: USER_A.email,
      });
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: "evt_1" },
        include: { creator: { select: { id: true, displayName: true, email: true } } },
      });
    });

    it("returns 404 for nonexistent event", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);

      const res = await createTestApp().request("/events/nonexistent");

      expect(res.status).toBe(404);
      expect((await res.json()) as Record<string, unknown>).toEqual({ error: "Event not found" });
    });
  });

  // =====================================================================
  // Issue #38 — GET /api/v1/events
  // =====================================================================
  describe("GET /events (#38)", () => {
    // S-EVT-4 → TC-EVT-004
    it("TC-EVT-004: lists events with type, category, and date filters; paginated", async () => {
      const data = [makeEvent()];
      vi.mocked(mockPrisma.event.findMany).mockResolvedValue(data as never);
      vi.mocked(mockPrisma.event.count).mockResolvedValue(1 as never);

      const res = await createTestApp().request(
        "/events?type=EVENT&category=music&startDate=2025-04-01&limit=10&offset=0",
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.data).toHaveLength(1);
      expect(body.pagination).toEqual({ total: 1, limit: 10, offset: 0 });
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "EVENT",
            category: "music",
          }),
          take: 10,
          skip: 0,
          orderBy: { startAt: "asc" },
        }),
      );
    });

    // S-EVT-15 → TC-EVT-015
    it("TC-EVT-015: filters events by source", async () => {
      vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
      vi.mocked(mockPrisma.event.count).mockResolvedValue(0 as never);

      const res = await createTestApp().request("/events?source=TICKETMASTER");

      expect(res.status).toBe(200);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: "TICKETMASTER" }),
        }),
      );
    });

    it("filters events by creator user", async () => {
      vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
      vi.mocked(mockPrisma.event.count).mockResolvedValue(0 as never);

      const res = await createTestApp().request("/events?user=user_b");

      expect(res.status).toBe(200);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ creatorId: "user_b" }),
        }),
      );
    });

    it("uses default pagination (limit=20, offset=0) when not specified", async () => {
      vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
      vi.mocked(mockPrisma.event.count).mockResolvedValue(0 as never);

      const res = await createTestApp().request("/events");

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.pagination).toEqual({ total: 0, limit: 20, offset: 0 });
    });

    it("applies search filter to title and description", async () => {
      vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
      vi.mocked(mockPrisma.event.count).mockResolvedValue(0 as never);

      await createTestApp().request("/events?search=jazz");

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: "jazz", mode: "insensitive" } },
              { description: { contains: "jazz", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("caps limit at 100", async () => {
      vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
      vi.mocked(mockPrisma.event.count).mockResolvedValue(0 as never);

      const res = await createTestApp().request("/events?limit=999");

      const body = (await res.json()) as Record<string, unknown>;
      expect((body.pagination as Record<string, unknown>).limit).toBe(100);
    });

    it("TC-EVT-023: rejects invalid enum and date filters", async () => {
      const invalidQueries = [
        "/events?type=INVALID",
        "/events?source=INVALID",
        "/events?status=INVALID",
        "/events?startDate=not-a-date",
        "/events?endDate=not-a-date",
      ];

      for (const path of invalidQueries) {
        const res = await createTestApp().request(path);

        expect(res.status).toBe(400);
        expect(mockPrisma.event.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.event.count).not.toHaveBeenCalled();
      }
    });
  });

  // =====================================================================
  // Issue #40 — PATCH /api/v1/events/:id
  // =====================================================================
  describe("PATCH /events/:id (#40)", () => {
    // S-EVT-5 → TC-EVT-005, S-AUTHZ-1 → TC-AUTHZ-001
    it("TC-EVT-005 / TC-AUTHZ-001: creator updates own event", async () => {
      const event = makeEvent();
      const updated = makeEvent({ title: "Mega Hackathon" });
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(event as never);
      vi.mocked(mockPrisma.event.update).mockResolvedValue(updated as never);

      const res = await patchEvent(createTestApp(USER_A), "evt_1", {
        title: "Mega Hackathon",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.title).toBe("Mega Hackathon");
      expect(mockPrisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "evt_1" },
          data: expect.objectContaining({ title: "Mega Hackathon" }),
        }),
      );
    });

    // S-AUTHZ-2 → TC-AUTHZ-002
    it("TC-AUTHZ-002: non-creator cannot update event (403)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(makeEvent() as never);

      const res = await patchEvent(createTestApp(USER_B), "evt_1", {
        title: "Hacked!",
      });

      expect(res.status).toBe(403);
      expect(mockPrisma.event.update).not.toHaveBeenCalled();
    });

    // S-EVT-7 → TC-EVT-007 (PATCH)
    it("TC-EVT-007: cannot modify external event (403)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeEvent({ source: "OSU_API", creatorId: null }) as never,
      );

      const res = await patchEvent(createTestApp(USER_A), "evt_1", {
        title: "Modified",
      });

      expect(res.status).toBe(403);
      expect(mockPrisma.event.update).not.toHaveBeenCalled();
    });

    // S-EVT-8 → TC-EVT-008
    it("TC-EVT-008: cancel an event (OPEN → CANCELLED)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeEvent({ status: "OPEN" }) as never,
      );
      vi.mocked(mockPrisma.event.update).mockResolvedValue(
        makeEvent({ status: "CANCELLED" }) as never,
      );

      const res = await patchEvent(createTestApp(USER_A), "evt_1", {
        status: "CANCELLED",
      });

      expect(res.status).toBe(200);
      expect(mockPrisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CANCELLED" }),
        }),
      );
    });

    // S-EVT-9 → TC-EVT-009
    it("TC-EVT-009: manual completion (IN_PROGRESS → COMPLETED)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeEvent({ status: "IN_PROGRESS" }) as never,
      );
      vi.mocked(mockPrisma.event.update).mockResolvedValue(
        makeEvent({ status: "COMPLETED" }) as never,
      );

      const res = await patchEvent(createTestApp(USER_A), "evt_1", {
        status: "COMPLETED",
      });

      expect(res.status).toBe(200);
      expect(mockPrisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "COMPLETED" }),
        }),
      );
    });

    // TC-EVT-020
    it("TC-EVT-020: rejects invalid status transition (COMPLETED → OPEN)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeEvent({ status: "COMPLETED" }) as never,
      );

      const res = await patchEvent(createTestApp(USER_A), "evt_1", {
        status: "OPEN",
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error).toContain("Invalid status transition");
      expect(mockPrisma.event.update).not.toHaveBeenCalled();
    });

    // S-EVT-16 → TC-EVT-016
    it("TC-EVT-016: update gig compensation; existing applications unaffected", async () => {
      const gig = makeEvent({
        type: "GIG",
        compensationAmount: 20,
        compensationType: "HOURLY",
      });
      const updatedGig = makeEvent({
        type: "GIG",
        compensationAmount: 25,
        compensationType: "HOURLY",
      });
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(gig as never);
      vi.mocked(mockPrisma.event.update).mockResolvedValue(updatedGig as never);

      const res = await patchEvent(createTestApp(USER_A), "evt_1", {
        compensation: { amount: 25, type: "HOURLY" },
      });

      expect(res.status).toBe(200);
      expect(mockPrisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            compensationAmount: 25,
            compensationType: "HOURLY",
          }),
        }),
      );
      // Applications are not touched — only event.update is called
      expect(mockPrisma.application.update).not.toHaveBeenCalled();
      expect(mockPrisma.application.delete).not.toHaveBeenCalled();
    });

    it("returns 404 for nonexistent event", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);

      const res = await patchEvent(createTestApp(USER_A), "nonexistent", {
        title: "Updated",
      });

      expect(res.status).toBe(404);
    });

    it("TC-EVT-022: rejects invalid update payload dates and compensation type", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(makeEvent() as never);

      const invalidBodies = [
        { startAt: "not-a-date" },
        { endAt: "not-a-date" },
        { compensation: { type: "INVALID" } },
      ];

      for (const body of invalidBodies) {
        const res = await patchEvent(createTestApp(USER_A), "evt_1", body);

        expect(res.status).toBe(400);
        expect(mockPrisma.event.update).not.toHaveBeenCalled();
      }
    });
  });

  // =====================================================================
  // Issue #41 — DELETE /api/v1/events/:id
  // =====================================================================
  describe("DELETE /events/:id (#41)", () => {
    // S-EVT-6 → TC-EVT-006
    it("TC-EVT-006: creator deletes own event", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(makeEvent() as never);
      vi.mocked(mockPrisma.event.delete).mockResolvedValue(makeEvent() as never);

      const res = await createTestApp(USER_A).request("/events/evt_1", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      expect(mockPrisma.event.delete).toHaveBeenCalledWith({ where: { id: "evt_1" } });
    });

    // S-EVT-14 → TC-EVT-014
    it("TC-EVT-014: delete cascades to applications, interactions, collectionItems", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(makeEvent() as never);
      vi.mocked(mockPrisma.event.delete).mockResolvedValue(makeEvent() as never);

      const res = await createTestApp(USER_A).request("/events/evt_1", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      // Cascade is enforced by Prisma schema (onDelete: Cascade on Application,
      // CollectionItem, Interaction, EventEmbedding). A single event.delete
      // triggers removal of all related rows.
      expect(mockPrisma.event.delete).toHaveBeenCalledWith({ where: { id: "evt_1" } });
    });

    // S-AUTHZ-3 → TC-AUTHZ-003
    it("TC-AUTHZ-003: non-creator cannot delete event (403)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(makeEvent() as never);

      const res = await createTestApp(USER_B).request("/events/evt_1", {
        method: "DELETE",
      });

      expect(res.status).toBe(403);
      expect(mockPrisma.event.delete).not.toHaveBeenCalled();
    });

    // S-EVT-7 → TC-EVT-007 (DELETE)
    it("TC-EVT-007: cannot delete external event (403)", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(
        makeEvent({ source: "OSU_API", creatorId: null }) as never,
      );

      const res = await createTestApp(USER_A).request("/events/evt_1", {
        method: "DELETE",
      });

      expect(res.status).toBe(403);
      expect(mockPrisma.event.delete).not.toHaveBeenCalled();
    });

    it("returns 404 for nonexistent event", async () => {
      vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null as never);

      const res = await createTestApp(USER_A).request("/events/nonexistent", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });
});
