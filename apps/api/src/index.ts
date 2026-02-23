import { Hono } from "hono";
import { cors } from "hono/cors";
import { getPrismaClient } from "./lib/prisma";

type Bindings = {
  DATABASE_URL: string;
  CORS_ORIGIN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (c, next) => {
  const origin = c.env?.CORS_ORIGIN ?? process.env.CORS_ORIGIN;
  const allowedOrigins = origin
    ? origin.split(",")
    : ["http://localhost:5173"];
  return cors({ origin: allowedOrigins })(c, next);
});

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/ping", (c) => {
  return c.json({ message: "pong" });
});

app.get("/api/db-check", async (c) => {
  try {
    const connectionString = c.env?.DATABASE_URL ?? process.env.DATABASE_URL;
    const prisma = getPrismaClient(connectionString);
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "disconnected";
    return c.json({ database: "disconnected", error: message }, 500);
  }
});

// Compatible with both Bun (reads `port`) and CF Workers (ignores `port`, uses `fetch`)
export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch
};
