import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware } from "@hono/clerk-auth";
import { getPrismaClient } from "./lib/prisma";
import { requireAuth } from "./middleware/auth";

type AppEnv = {
  Bindings: {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
  };
  Variables: {
    user: { id: string; clerkId: string; email: string };
  };
};

const base = new Hono<AppEnv>();

// CORS only needed for local dev (FE at :5173, BE at :3001).
// In production both are served from the same CF Worker origin.
base.use("/api/*", cors({ origin: "http://localhost:5173" }));

// Clerk JWT verification + user auto-provisioning for /api/v1/*
base.use("/api/v1/*", clerkMiddleware());
base.use("/api/v1/*", requireAuth);

export const app = base
  .get("/api/health", (c) => {
    return c.json({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString()
    });
  })
  .get("/api/ping", (c) => {
    return c.json({ message: "pong" });
  })
  .get("/api/db-check", async (c) => {
    try {
      const connectionString = c.env?.DATABASE_URL ?? (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
      const prisma = getPrismaClient(connectionString);
      await prisma.$queryRaw`SELECT 1`;
      return c.json({ database: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "disconnected";
      return c.json({ database: "disconnected", error: message }, 500);
    }
  })
  .get("/api/v1/auth/me", (c) => {
    const user = c.get("user");
    return c.json(user);
  })
  .get("/api/v1/users/me", async (c) => {
    const { id } = c.get("user");
    const connectionString =
      c.env?.DATABASE_URL ??
      (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
    const prisma = getPrismaClient(connectionString);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return c.json(
        { type: "https://social-osu.app/problems/not-found", title: "Resource not found", status: 404, detail: "User not found" },
        404
      );
    }
    return c.json(user);
  })
  .patch("/api/v1/users/me", async (c) => {
    const { id } = c.get("user");
    const body = await c.req.json();
    const allowedFields = ["displayName", "major", "gradYear", "interests"] as const;
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }
    const connectionString =
      c.env?.DATABASE_URL ??
      (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
    const prisma = getPrismaClient(connectionString);
    const updated = await prisma.user.update({ where: { id }, data });
    return c.json(updated);
  })
  .get("/api/v1/users/:id", async (c) => {
    const { id: authUserId } = c.get("user");
    const targetId = c.req.param("id");
    const connectionString =
      c.env?.DATABASE_URL ??
      (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
    const prisma = getPrismaClient(connectionString);

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return c.json(
        { type: "https://social-osu.app/problems/not-found", title: "Resource not found", status: 404, detail: `User ${targetId} was not found` },
        404
      );
    }

    const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
    const offset = Number(c.req.query("offset") ?? 0);

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

export type AppType = typeof app;

// Compatible with both Bun (reads `port`) and CF Workers (ignores `port`, uses `fetch`)
export default {
  port: typeof process !== "undefined" ? Number(process.env.PORT ?? 3001) : 3001,
  fetch: app.fetch
};
