import { clerkMiddleware } from "@hono/clerk-auth";
import type { Env, Hono, Schema } from "hono";
import { cors } from "hono/cors";
import { appFactory } from "./factory";
import { problemFromError, notFound, ProblemError } from "./lib/problem-details";
import { requireAuth } from "./middleware/auth";
import { withRequestResources } from "./middleware/request-resources";
import { auth } from "./routes/auth";
import { collections } from "./routes/collections";
import { events } from "./routes/events";
import { gigs } from "./routes/gigs";
import { health } from "./routes/health";
import { users } from "./routes/users";

export function registerApiErrorHandlers<
  E extends Env,
  S extends Schema,
  BasePath extends string,
>(app: Hono<E, S, BasePath>) {
  app.notFound((c) => notFound(c, "Route not found"));
  app.onError((error, c) => {
    if (!(error instanceof ProblemError)) {
      console.error(error);
    }

    return problemFromError(c, error);
  });

  return app;
}

export function createApiApp() {
  const app = appFactory.createApp();

  // CORS only needed for local dev (FE at :5173, BE at :3001).
  // In production both are served from the same CF Worker origin.
  app.use("/api/*", cors({ origin: "http://localhost:5173" }));

  app.use("/api/v1/*", withRequestResources);
  app.use("/api/v1/*", clerkMiddleware());
  app.use("/api/v1/*", requireAuth);

  app.route("/api", health);
  app.route("/api/v1/auth", auth);
  app.route("/api/v1/users", users);
  app.route("/api/v1/events", events);
  app.route("/api/v1/gigs", gigs);
  app.route("/api/v1/collections", collections);

  return registerApiErrorHandlers(app);
}

export const app = createApiApp();
export type AppType = typeof app;
