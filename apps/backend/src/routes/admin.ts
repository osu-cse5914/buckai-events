import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";
import { internalError } from "../lib/problem-details";
import { requireAdmin } from "../middleware/auth";
import { syncExternalEvents } from "../services/external-ingestion";

export const admin = new Hono<AppEnv>().post(
  "/external-ingestion/sync",
  requireAdmin,
  async (c) => {
    try {
      const result = await syncExternalEvents(getPrisma(c), {
        ticketmasterApiKey: c.env.TICKETMASTER_API_KEY,
      });
      return c.json(result);
    } catch (error) {
      return internalError(
        c,
        error instanceof Error ? error.message : "Failed to sync external events",
      );
    }
  },
);
