import { Hono } from "hono";
import { cors } from "hono/cors";
import { getPrismaClient } from "./lib/prisma";

const app = new Hono();
const port = Number(process.env.PORT ?? 3001);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"];

app.use("*", cors({ origin: allowedOrigins }));

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
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "disconnected";
    return c.json({ database: "disconnected", error: message }, 500);
  }
});

const server = Bun.serve({
  port,
  fetch: app.fetch
});

console.log(`API server listening on http://localhost:${server.port}`);

function shutdown() {
  console.log("Shutting down...");
  server.stop().then(async () => {
    try {
      const prisma = getPrismaClient();
      await prisma.$disconnect();
    } catch {
      // client may not have been initialized
    }
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
