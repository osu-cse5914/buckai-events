import { clerkMiddleware } from "@hono/clerk-auth";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { appFactory } from "./factory";
import { problemFromError, notFound, ProblemError } from "./lib/problem-details";
import { requireAuth } from "./middleware/auth";
import { withRequestResources } from "./middleware/request-resources";
import { admin } from "./routes/admin";
import { auth } from "./routes/auth";
import { collections } from "./routes/collections";
import { events } from "./routes/events";
import { gigs } from "./routes/gigs";
import { health } from "./routes/health";
import { interactions } from "./routes/interactions";
import { social } from "./routes/social";
import { users } from "./routes/users";

type ErrorHandlerRegistrable = {
  notFound: (handler: (c: Context) => Response | Promise<Response>) => unknown;
  onError: (
    handler: (error: Error, c: Context) => Response | Promise<Response>,
  ) => unknown;
};

export function registerApiErrorHandlers<T>(app: T): T {
  const errorHandlerApp = app as T & ErrorHandlerRegistrable;

  errorHandlerApp.notFound((c) => notFound(c, "Route not found"));
  errorHandlerApp.onError((error, c) => {
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
    .route("/api/v1/admin", admin)
    .route("/api/v1/users", users)
    .route("/api/v1/events", events)
    .route("/api/v1/gigs", gigs)
    .route("/api/v1/interactions", interactions)
    .route("/api/v1/social", social)
    .route("/api/v1/collections", collections);

  return registerApiErrorHandlers(routedApp);
}

export const app = createApiApp();
export type AppType = typeof app;
