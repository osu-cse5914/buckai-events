import type { PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import { getPrisma } from "../lib/prisma";
import type { AppEnv } from "../lib/types";
import {
  dispatchDetachedTask,
  resolveConnectionString,
  runWithPrisma,
} from "../lib/worker-runtime";
import { generateEventTagging } from "./ai-tagging";
import {
  createEventEmbeddingTextHash,
  generateEventEmbedding,
  storeEventEmbedding,
} from "./event-embeddings";

export const EVENT_PIPELINE_STAGE_ORDER = ["TAGGING", "EMBEDDING"] as const;
export const EVENT_PIPELINE_JOB_TRIGGERS = [
  "EVENT_CREATE",
  "EVENT_UPDATE",
  "ADMIN_RERUN",
  "EMBEDDING_BACKFILL",
] as const;

export type EventPipelineStage = (typeof EVENT_PIPELINE_STAGE_ORDER)[number];
export type EventPipelineTrigger = (typeof EVENT_PIPELINE_JOB_TRIGGERS)[number];

type EventPipelineDispatcher = (task: Promise<unknown>, label: string) => void;

export async function createEventPipelineJob(
  prisma: PrismaClient,
  input: {
    eventIds: string[];
    stages: EventPipelineStage[];
    trigger: EventPipelineTrigger;
    requestedByUserId?: string | null;
    connectionString?: string;
    env?: Record<string, string | undefined>;
    dispatch?: EventPipelineDispatcher;
  },
) {
  const eventIds = Array.from(new Set(input.eventIds));
  const now = new Date();

  const job = await prisma.eventPipelineJob.create({
    data: {
      trigger: input.trigger,
      status: eventIds.length === 0 ? "SUCCEEDED" : "QUEUED",
      requestedByUserId: input.requestedByUserId ?? null,
      stages: input.stages,
      startedAt: eventIds.length === 0 ? now : null,
      finishedAt: eventIds.length === 0 ? now : null,
      runs:
        eventIds.length > 0
          ? {
              create: eventIds.flatMap((eventId) =>
                input.stages.map((stage) => ({
                  eventId,
                  stage,
                  status: "QUEUED",
                })),
              ),
            }
          : undefined,
    },
    include: {
      runs: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { stage: "asc" }],
      },
    },
  });

  const runs = job.runs ?? [];

  if (runs.length > 0 && input.dispatch && input.connectionString) {
    input.dispatch(
      runWithPrisma(input.connectionString, (jobPrisma) =>
        executeEventPipelineJob(jobPrisma, {
          jobId: job.id,
          env: input.env,
        }),
      ),
      `execute event pipeline job ${job.id}`,
    );
  }

  return {
    ...job,
    runs,
  };
}

export async function createEmbeddingBackfillJob(
  prisma: PrismaClient,
  input: {
    requestedByUserId?: string | null;
    connectionString?: string;
    env?: Record<string, string | undefined>;
    dispatch?: EventPipelineDispatcher;
  },
) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT e.id
    FROM "Event" e
    LEFT JOIN "EventEmbedding" ee ON ee."eventId" = e.id
    WHERE ee.id IS NULL
    ORDER BY e."createdAt" DESC
  `;

  return createEventPipelineJob(prisma, {
    eventIds: rows.map((row) => row.id),
    stages: ["EMBEDDING"],
    trigger: "EMBEDDING_BACKFILL",
    requestedByUserId: input.requestedByUserId,
    connectionString: input.connectionString,
    env: input.env,
    dispatch: input.dispatch,
  });
}

export async function listRecentEventPipelineJobs(
  prisma: PrismaClient,
  { limit = 10 }: { limit?: number } = {},
) {
  return prisma.eventPipelineJob.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      runs: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { stage: "asc" }],
      },
    },
  });
}

async function executeTaggingRun(
  prisma: PrismaClient,
  eventId: string,
  env?: Record<string, string | undefined>,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const tagging = await generateEventTagging(
    {
      title: event.title,
      description: event.description,
    },
    { env },
  );

  await prisma.event.update({
    where: { id: eventId },
    data: {
      tags: tagging.tags,
      summary: tagging.summary,
      category: tagging.category,
    },
  });

  return {
    status: "SUCCEEDED" as const,
    textHash: null,
  };
}

async function executeEmbeddingRun(
  prisma: PrismaClient,
  eventId: string,
  {
    env,
    generateEventEmbeddingImpl = generateEventEmbedding,
  }: {
    env?: Record<string, string | undefined>;
    generateEventEmbeddingImpl?: typeof generateEventEmbedding;
  },
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      embedding: true,
    },
  });

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const embeddingInput = {
    title: event.title,
    description: event.description,
    category: event.category,
    tags: event.tags,
  };
  const textHash = await createEventEmbeddingTextHash(embeddingInput);

  if (event.embedding?.textHash === textHash) {
    return {
      status: "SKIPPED" as const,
      textHash,
    };
  }

  const generated = await generateEventEmbeddingImpl(embeddingInput, { env });

  await storeEventEmbedding(prisma, {
    eventId,
    embedding: generated.embedding,
    textHash: generated.textHash,
  });

  return {
    status: "SUCCEEDED" as const,
    textHash: generated.textHash,
  };
}

export async function executeEventPipelineJob(
  prisma: PrismaClient,
  input: {
    jobId: string;
    env?: Record<string, string | undefined>;
    generateEventEmbedding?: typeof generateEventEmbedding;
  },
) {
  const job = await prisma.eventPipelineJob.findUnique({
    where: { id: input.jobId },
    include: {
      runs: {
        include: {
          event: {
            include: {
              embedding: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { stage: "asc" }],
      },
    },
  });

  if (!job) {
    throw new Error(`Pipeline job ${input.jobId} not found`);
  }

  if (job.runs.length === 0) {
    await prisma.eventPipelineJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        startedAt: job.startedAt ?? new Date(),
        finishedAt: new Date(),
      },
    });
    return;
  }

  await prisma.eventPipelineJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      startedAt: job.startedAt ?? new Date(),
      error: null,
    },
  });

  let failedRuns = 0;

  for (const run of job.runs) {
    await prisma.eventPipelineRun.update({
      where: { id: run.id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        error: null,
      },
    });

    try {
      const outcome =
        run.stage === "TAGGING"
          ? await executeTaggingRun(prisma, run.eventId, input.env)
          : await executeEmbeddingRun(prisma, run.eventId, {
              env: input.env,
              generateEventEmbeddingImpl: input.generateEventEmbedding,
            });

      await prisma.eventPipelineRun.update({
        where: { id: run.id },
        data: {
          status: outcome.status,
          textHash: outcome.textHash,
          error: null,
          finishedAt: new Date(),
        },
      });
    } catch (error) {
      failedRuns += 1;
      await prisma.eventPipelineRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Pipeline stage failed",
          finishedAt: new Date(),
        },
      });
    }
  }

  await prisma.eventPipelineJob.update({
    where: { id: job.id },
    data: {
      status:
        failedRuns === 0
          ? "SUCCEEDED"
          : failedRuns === job.runs.length
            ? "FAILED"
            : "PARTIAL",
      finishedAt: new Date(),
    },
  });
}

export async function scheduleEventPipelineFromContext(
  c: Context<AppEnv>,
  input: {
    eventId: string;
    stages: EventPipelineStage[];
    trigger: EventPipelineTrigger;
    requestedByUserId?: string | null;
  },
) {
  return createEventPipelineJob(getPrisma(c), {
    eventIds: [input.eventId],
    stages: input.stages,
    trigger: input.trigger,
    requestedByUserId: input.requestedByUserId,
    connectionString: resolveConnectionString(c.env),
    env: c.env as unknown as Record<string, string | undefined>,
    dispatch: (task, label) => dispatchDetachedTask(c, task, label),
  });
}

export async function scheduleEmbeddingBackfillFromContext(
  c: Context<AppEnv>,
  input: {
    requestedByUserId?: string | null;
  },
) {
  return createEmbeddingBackfillJob(getPrisma(c), {
    requestedByUserId: input.requestedByUserId,
    connectionString: resolveConnectionString(c.env),
    env: c.env as unknown as Record<string, string | undefined>,
    dispatch: (task, label) => dispatchDetachedTask(c, task, label),
  });
}
