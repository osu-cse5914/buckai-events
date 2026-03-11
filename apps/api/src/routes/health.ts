import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";

export const health = new Hono<AppEnv>()
  .get("/health", (c) => {
    return c.json({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString()
    });
  })
  .get("/ping", (c) => {
    return c.json({ message: "pong" });
  })
  .get("/db-check", async (c) => {
    try {
      const prisma = getPrisma(c);
      await prisma.$queryRaw`SELECT 1`;
      return c.json({ database: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "disconnected";
      return c.json({ database: "disconnected", error: message }, 500);
    }
  });
