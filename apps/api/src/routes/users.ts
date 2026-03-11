import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

export const users = new Hono<AppEnv>()
  .get("/me/applications", async (c) => {
    const { id } = c.get("user");
    const prisma = getPrisma(c);

    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");

    const parsedLimit = Number(limitParam);
    const limit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 20, 1),
      100,
    );

    const parsedOffset = Number(offsetParam);
    const offset = Math.max(
      Number.isFinite(parsedOffset) ? parsedOffset : 0,
      0,
    );

    const where = { applicantId: id };
    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where,
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
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ]);

    return c.json({
      data,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  })
  .get("/me", async (c) => {
    const { id } = c.get("user");
    const prisma = getPrisma(c);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return c.json(
        { type: "https://social-osu.app/problems/not-found", title: "Resource not found", status: 404, detail: "User not found" },
        404
      );
    }
    return c.json(user);
  })
  .patch("/me", async (c) => {
    const { id } = c.get("user");
    const body = await c.req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return c.json(
        { type: "https://social-osu.app/problems/invalid-body", title: "Invalid request body", status: 400, detail: "Request body must be a JSON object" },
        400
      );
    }
    const allowedFields = ["displayName", "major", "gradYear", "interests"] as const;
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }
    const prisma = getPrisma(c);
    const updated = await prisma.user.update({ where: { id }, data });
    return c.json(updated);
  })
  .get("/:id", async (c) => {
    const { id: authUserId } = c.get("user");
    const targetId = c.req.param("id");
    const prisma = getPrisma(c);

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return c.json(
        { type: "https://social-osu.app/problems/not-found", title: "Resource not found", status: 404, detail: `User ${targetId} was not found` },
        404
      );
    }

    const rawLimit = c.req.query("limit");
    const rawOffset = c.req.query("offset");
    const parsedLimit = rawLimit !== undefined ? Number(rawLimit) : 20;
    const parsedOffset = rawOffset !== undefined ? Number(rawOffset) : 0;
    if (Number.isNaN(parsedLimit) || Number.isNaN(parsedOffset)) {
      return c.json(
        { type: "https://social-osu.app/problems/invalid-query", title: "Invalid query parameter", status: 400, detail: "limit and offset must be numeric" },
        400
      );
    }
    const limit = Math.min(parsedLimit, 100);
    const offset = parsedOffset;

    const [events, eventCount, follow] = await Promise.all([
      prisma.event.findMany({
        where: { creatorId: targetId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        take: limit,
        skip: offset,
      }),
      prisma.event.count({
        where: { creatorId: targetId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      prisma.follow.findUnique({
        where: {
          followerId_followeeId: { followerId: authUserId, followeeId: targetId },
        },
      }),
    ]);

    return c.json({
      id: user.id,
      displayName: user.displayName,
      major: user.major,
      gradYear: user.gradYear,
      interests: user.interests,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt,
      isFollowing: !!follow,
      createdEvents: {
        items: events,
        meta: { total: eventCount, limit, offset },
      },
    });
  });
