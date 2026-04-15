import { Hono } from "hono";
import { validator } from "hono/validator";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";
import { internalError } from "../lib/problem-details";
import { requireAdmin } from "../middleware/auth";
import { dispatchDetachedTask, resolveConnectionString } from "../lib/worker-runtime";
import { syncExternalEvents } from "../services/external-ingestion";
import {
  createEmbeddingBackfillJob,
  createEventPipelineJob,
  listRecentEventPipelineJobs,
} from "../services/event-pipeline";

const validatePipelineRerunJson = validator("json", (value) => {
  const mode =
    typeof value === "object" && value !== null && "mode" in value && value.mode === "FULL_PIPELINE"
      ? "FULL_PIPELINE"
      : "EMBEDDING";

  return { mode };
});

export const admin = new Hono<AppEnv>()
  .post("/external-ingestion/sync", requireAdmin, async (c) => {
    try {
      const prisma = getPrisma(c);
      const result = await syncExternalEvents(prisma, {
        ticketmasterApiKey: c.env.TICKETMASTER_API_KEY,
        scheduleEventPipeline: (input) =>
          createEventPipelineJob(prisma, {
            eventIds: [input.eventId],
            stages: input.stages,
            trigger: input.trigger,
            connectionString: resolveConnectionString(c.env),
            env: c.env as unknown as Record<string, string | undefined>,
            dispatch: (task, label) => dispatchDetachedTask(c, task, label),
          }),
      });
      return c.json(result);
    } catch (error) {
      return internalError(
        c,
        error instanceof Error ? error.message : "Failed to sync external events",
      );
    }
  })
  .get("/ai-pipeline/jobs", requireAdmin, async (c) => {
    try {
      const limitValue = Number(c.req.query("limit") ?? "10");
      const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 25) : 10;
      const jobs = await listRecentEventPipelineJobs(getPrisma(c), { limit });
      return c.json(jobs);
    } catch (error) {
      return internalError(
        c,
        error instanceof Error ? error.message : "Failed to load AI pipeline jobs",
      );
    }
  })
  .post("/ai-pipeline/events/:id/rerun", requireAdmin, validatePipelineRerunJson, async (c) => {
    try {
      const { id } = c.req.param();
      const { mode } = c.req.valid("json");
      const job = await createEventPipelineJob(getPrisma(c), {
        eventIds: [id],
        stages: mode === "FULL_PIPELINE" ? ["TAGGING", "EMBEDDING"] : ["EMBEDDING"],
        trigger: "ADMIN_RERUN",
        requestedByUserId: c.get("user").id,
        connectionString: resolveConnectionString(c.env),
        env: c.env as unknown as Record<string, string | undefined>,
        dispatch: (task, label) => dispatchDetachedTask(c, task, label),
      });
      return c.json(job, 202);
    } catch (error) {
      return internalError(
        c,
        error instanceof Error ? error.message : "Failed to create AI rerun job",
      );
    }
  })
  .post("/ai-pipeline/backfill", requireAdmin, async (c) => {
    try {
      const job = await createEmbeddingBackfillJob(getPrisma(c), {
        requestedByUserId: c.get("user").id,
        connectionString: resolveConnectionString(c.env),
        env: c.env as unknown as Record<string, string | undefined>,
        dispatch: (task, label) => dispatchDetachedTask(c, task, label),
      });
      return c.json(job, 202);
    } catch (error) {
      return internalError(
        c,
        error instanceof Error ? error.message : "Failed to create embedding backfill job",
      );
    }
  });
