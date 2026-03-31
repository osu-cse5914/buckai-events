import { clerkMiddleware } from "@hono/clerk-auth";
import { cors } from "hono/cors";
import { appFactory } from "./factory";
import { requireAuth } from "./middleware/auth";
import { withRequestResources } from "./middleware/request-resources";
import { auth } from "./routes/auth";
import { collections } from "./routes/collections";
import { events } from "./routes/events";
import { gigs } from "./routes/gigs";
import { health } from "./routes/health";
import { recommendations } from "./routes/recommendations";
import { users } from "./routes/users";

export function createApiApp() {
  const app = appFactory.createApp();

  // CORS only needed for local dev (FE at :5173, BE at :3001).
  // In production both are served from the same CF Worker origin.
  app.use("/api/*", cors({ origin: "http://localhost:5173" }));

  app.use("/api/v1/*", withRequestResources);
  app.use("/api/v1/*", clerkMiddleware());
  app.use("/api/v1/*", requireAuth);

  return app
    .route("/api", health)
    .route("/api/v1/auth", auth)
    .route("/api/v1/users", users)
    .route("/api/v1/events", events)
    .route("/api/v1/gigs", gigs)
    .route("/api/v1/recommendations", recommendations)
    .route("/api/v1/collections", collections);
}

export const app = createApiApp();
export type AppType = typeof app;
