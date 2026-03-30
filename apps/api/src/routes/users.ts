import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";
import { paginated, paginatedMeta, parsePagination } from "../lib/pagination";
import { badRequest, notFound } from "../lib/problem-details";

export const users = new Hono<AppEnv>()
  .get("/me/applications", async (c) => {
    const { id } = c.get("user");
    const prisma = getPrisma(c);
    const pagination = parsePagination(c);
    if ("response" in pagination) {
      return pagination.response;
    }
    const { limit, offset } = pagination;

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

    return c.json(paginated(data, { total, limit, offset }));
  })
  .get("/me", async (c) => {
    const { id } = c.get("user");
    const prisma = getPrisma(c);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return notFound(c, "User not found");
    }
    return c.json(user);
  })
  .patch("/me", async (c) => {
    const { id } = c.get("user");
    const body = await c.req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return badRequest(
        c,
        "Request body must be a JSON object",
        "invalid-body",
        "Invalid request body",
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
      return notFound(c, `User ${targetId} was not found`);
    }

    const pagination = parsePagination(c, { strict: true });
    if ("response" in pagination) {
      return pagination.response;
    }
    const { limit, offset } = pagination;

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
      createdEvents: paginatedMeta(events, { total: eventCount, limit, offset }),
    });
  });
