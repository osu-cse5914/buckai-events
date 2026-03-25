import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

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

const CREATOR_SELECT = { id: true, displayName: true, email: true } as const;
const EVENT_TYPES = ["EVENT", "GIG"] as const;
const EVENT_SOURCES = ["OSU_API", "TICKETMASTER", "USER"] as const;
const EVENT_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const COMPENSATION_TYPES = ["FIXED", "HOURLY"] as const;

function isAllowedValue<T extends string>(value: string, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// --- Routes ---

export const events = new Hono<AppEnv>()

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

    if (!isAllowedValue(type, EVENT_TYPES)) {
      return c.json({ error: "type must be EVENT or GIG" }, 400);
    }

    const parsedStartAt = parseDateValue(startAt);
    if (!parsedStartAt) {
      return c.json({ error: "startAt must be a valid date" }, 400);
    }

    let parsedEndAt: Date | null = null;
    if (endAt !== undefined && endAt !== null) {
      parsedEndAt = parseDateValue(endAt);
      if (!parsedEndAt) {
        return c.json({ error: "endAt must be a valid date" }, 400);
      }
    }

    if (
      compensation?.type !== undefined &&
      compensation?.type !== null &&
      !isAllowedValue(compensation.type, COMPENSATION_TYPES)
    ) {
      return c.json({ error: "compensation.type must be FIXED or HOURLY" }, 400);
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
        startAt: parsedStartAt,
        endAt: parsedEndAt,
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
    const userId = c.req.query("user");
    const search = c.req.query("search");
    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");

    const where: Record<string, unknown> = {};

    if (type) {
      if (!isAllowedValue(type, EVENT_TYPES)) {
        return c.json({ error: "type must be EVENT or GIG" }, 400);
      }
      where.type = type;
    }
    if (category) where.category = category;
    if (source) {
      if (!isAllowedValue(source, EVENT_SOURCES)) {
        return c.json({ error: "source must be OSU_API, TICKETMASTER, or USER" }, 400);
      }
      where.source = source;
    }
    if (status) {
      if (!isAllowedValue(status, EVENT_STATUSES)) {
        return c.json({ error: "status must be OPEN, IN_PROGRESS, COMPLETED, or CANCELLED" }, 400);
      }
      where.status = status;
    }
    if (userId) where.creatorId = userId;

    if (startDate || endDate) {
      const startAtFilter: Record<string, unknown> = {};
      if (startDate) {
        const parsedStartDate = parseDateValue(startDate);
        if (!parsedStartDate) {
          return c.json({ error: "startDate must be a valid date" }, 400);
        }
        startAtFilter.gte = parsedStartDate;
      }
      if (endDate) {
        const parsedEndDate = parseDateValue(endDate);
        if (!parsedEndDate) {
          return c.json({ error: "endDate must be a valid date" }, 400);
        }
        startAtFilter.lte = parsedEndDate;
      }
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

    if (body.startAt !== undefined) {
      const parsedStartAt = parseDateValue(body.startAt);
      if (!parsedStartAt) {
        return c.json({ error: "startAt must be a valid date" }, 400);
      }
      body.startAt = parsedStartAt;
    }

    if (body.endAt !== undefined && body.endAt !== null) {
      const parsedEndAt = parseDateValue(body.endAt);
      if (!parsedEndAt) {
        return c.json({ error: "endAt must be a valid date" }, 400);
      }
      body.endAt = parsedEndAt;
    }

    if (
      body.compensation?.type !== undefined &&
      body.compensation?.type !== null &&
      !isAllowedValue(body.compensation.type, COMPENSATION_TYPES)
    ) {
      return c.json({ error: "compensation.type must be FIXED or HOURLY" }, 400);
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.location?.name !== undefined) data.locationName = body.location.name;
    if (body.location?.latitude !== undefined) data.locationLatitude = body.location.latitude;
    if (body.location?.longitude !== undefined) data.locationLongitude = body.location.longitude;
    if (body.startAt !== undefined) data.startAt = body.startAt;
    if (body.endAt !== undefined) data.endAt = body.endAt ?? null;
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
