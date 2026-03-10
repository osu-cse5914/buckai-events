import { Hono } from "hono";
import type { Context } from "hono";
import { getPrismaClient } from "../lib/prisma";

type EventsEnv = {
  Bindings: {
    DATABASE_URL: string;
  };
  Variables: {
    user: { id: string; clerkId: string; email: string };
  };
};

// --- Status transition validation (Issue #42) ---

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidStatusTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Helpers ---

function getPrisma(c: Context<EventsEnv>) {
  const connectionString =
    (c.env as Record<string, string>)?.DATABASE_URL ??
    (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
  return getPrismaClient(connectionString);
}

const CREATOR_SELECT = { id: true, displayName: true, email: true } as const;

// --- Routes ---

export const events = new Hono<EventsEnv>()

  // POST / — Create event or gig (#37)
  .post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();
    const { title, description, type, location, startAt, endAt, compensation } = body;

    if (!title || !description || !type || !location?.name || !startAt) {
      return c.json(
        { error: "Missing required fields: title, description, type, location.name, startAt" },
        400,
      );
    }

    if (type !== "EVENT" && type !== "GIG") {
      return c.json({ error: "type must be EVENT or GIG" }, 400);
    }

    const prisma = getPrisma(c);

    const event = await prisma.event.create({
      data: {
        title,
        description,
        type,
        source: "USER",
        locationName: location.name,
        locationLatitude: location.latitude ?? null,
        locationLongitude: location.longitude ?? null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        compensationAmount: compensation?.amount ?? null,
        compensationCurrency: compensation?.currency ?? "USD",
        compensationType: compensation?.type ?? null,
        status: "OPEN",
        creatorId: user.id,
        tags: [],
        summary: null,
        category: null,
      },
      include: { creator: { select: CREATOR_SELECT } },
    });

    return c.json(event, 201);
  })

  // GET / — List events with filtering and pagination (#38)
  .get("/", async (c) => {
    const prisma = getPrisma(c);

    const type = c.req.query("type");
    const category = c.req.query("category");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const source = c.req.query("source");
    const status = c.req.query("status");
    const search = c.req.query("search");
    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (source) where.source = source;
    if (status) where.status = status;

    if (startDate || endDate) {
      const startAtFilter: Record<string, unknown> = {};
      if (startDate) startAtFilter.gte = new Date(startDate);
      if (endDate) startAtFilter.lte = new Date(endDate);
      where.startAt = startAtFilter;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);
    const offset = Math.max(Number(offsetParam) || 0, 0);

    const [data, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: { creator: { select: CREATOR_SELECT } },
        orderBy: { startAt: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.event.count({ where }),
    ]);

    return c.json({ data, pagination: { total, limit, offset } });
  })

  // GET /:id — Event detail (#39)
  .get("/:id", async (c) => {
    const prisma = getPrisma(c);
    const id = c.req.param("id");

    const event = await prisma.event.findUnique({
      where: { id },
      include: { creator: { select: CREATOR_SELECT } },
    });

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    return c.json(event);
  })

  // PATCH /:id — Update event (#40, #42)
  .patch("/:id", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    if (event.source !== "USER") {
      return c.json({ error: "External events cannot be modified" }, 403);
    }

    if (event.creatorId !== user.id) {
      return c.json({ error: "Only the event creator can update this event" }, 403);
    }

    if (body.status && body.status !== event.status) {
      if (!isValidStatusTransition(event.status, body.status)) {
        return c.json(
          { error: `Invalid status transition from ${event.status} to ${body.status}` },
          400,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.location?.name !== undefined) data.locationName = body.location.name;
    if (body.location?.latitude !== undefined) data.locationLatitude = body.location.latitude;
    if (body.location?.longitude !== undefined) data.locationLongitude = body.location.longitude;
    if (body.startAt !== undefined) data.startAt = new Date(body.startAt);
    if (body.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.compensation !== undefined) {
      if (body.compensation.amount !== undefined) data.compensationAmount = body.compensation.amount;
      if (body.compensation.currency !== undefined)
        data.compensationCurrency = body.compensation.currency;
      if (body.compensation.type !== undefined) data.compensationType = body.compensation.type;
    }

    const updated = await prisma.event.update({
      where: { id },
      data,
      include: { creator: { select: CREATOR_SELECT } },
    });

    return c.json(updated);
  })

  // DELETE /:id — Delete event with cascade (#41)
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const prisma = getPrisma(c);
    const id = c.req.param("id");

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    if (event.source !== "USER") {
      return c.json({ error: "External events cannot be deleted" }, 403);
    }

    if (event.creatorId !== user.id) {
      return c.json({ error: "Only the event creator can delete this event" }, 403);
    }

    // Prisma schema cascades to applications, interactions, collectionItems, embedding
    await prisma.event.delete({ where: { id } });

    return c.json({ message: "Event deleted" });
  });
