import { Hono } from "hono";
import { cors } from "hono/cors";
import { getPrismaClient } from "./lib/prisma";

type Bindings = {
  DATABASE_URL: string;
};

const base = new Hono<{ Bindings: Bindings }>();

// CORS only needed for local dev (FE at :5173, BE at :3001).
// In production both are served from the same CF Worker origin.
base.use("/api/*", cors({ origin: "http://localhost:5173" }));

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
  });

export type AppType = typeof app;

// Compatible with both Bun (reads `port`) and CF Workers (ignores `port`, uses `fetch`)
export default {
  port: typeof process !== "undefined" ? Number(process.env.PORT ?? 3001) : 3001,
  fetch: app.fetch
};
