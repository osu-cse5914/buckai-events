import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware } from "@hono/clerk-auth";
import type { AppEnv } from "./lib/types";
import { requireAuth } from "./middleware/auth";
import { health } from "./routes/health";
import { auth } from "./routes/auth";
import { users } from "./routes/users";
import { events } from "./routes/events";

const base = new Hono<AppEnv>();

// CORS only needed for local dev (FE at :5173, BE at :3001).
// In production both are served from the same CF Worker origin.
base.use("/api/*", cors({ origin: "http://localhost:5173" }));

// Clerk JWT verification + user auto-provisioning for /api/v1/*
base.use("/api/v1/*", clerkMiddleware());
base.use("/api/v1/*", requireAuth);

export const app = base
  .route("/api", health)
  .route("/api/v1/auth", auth)
  .route("/api/v1/users", users)
  .route("/api/v1/events", events);

export type AppType = typeof app;

// Compatible with both Bun (reads `port`) and CF Workers (ignores `port`, uses `fetch`)
export default {
  port: typeof process !== "undefined" ? Number(process.env.PORT ?? 3001) : 3001,
  fetch: app.fetch
};
