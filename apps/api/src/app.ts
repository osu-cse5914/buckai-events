import { clerkMiddleware } from "@hono/clerk-auth";
import type { Hono } from "hono";
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

export function registerApiErrorHandlers<T extends Hono<any, any, any>>(
  app: T,
): T {
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

  const routedApp = app
    .route("/api", health)
    .route("/api/v1/auth", auth)
    .route("/api/v1/users", users)
    .route("/api/v1/events", events)
    .route("/api/v1/gigs", gigs)
    .route("/api/v1/collections", collections);

  return registerApiErrorHandlers(routedApp);
}

export const app = createApiApp();
export type AppType = typeof app;
