import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockPrisma } from "./helpers/prisma";
import { buildEventPipelineRun, buildEventWithEmbedding } from "./factories";
import { createEventEmbeddingTextHash } from "../services/event-embeddings";
import {
  createEmbeddingBackfillJob,
  createEventPipelineJob,
  executeEventPipelineJob,
} from "../services/event-pipeline";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return buildEventWithEmbedding({
    title: "Jazz Night",
    description: "Live music from student groups",
    category: "music",
    tags: ["jazz", "live-music"],
    creatorId: "user_a",
    startAt: new Date("2026-04-01T09:00:00Z"),
    createdAt: new Date("2026-03-31T12:00:00Z"),
    updatedAt: new Date("2026-03-31T12:00:00Z"),
    ...overrides,
  });
}

function makeRun(overrides: Record<string, unknown> = {}) {
  return buildEventPipelineRun({
    event: makeEvent(),
    createdAt: new Date("2026-03-31T12:00:00Z"),
    updatedAt: new Date("2026-03-31T12:00:00Z"),
    ...overrides,
  });
}

describe("[phase:4] [regression:always] Event enrichment pipeline", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("TC-EMBED-001: creates queued tagging and embedding runs for a full pipeline job", async () => {
    vi.mocked(mockPrisma.eventPipelineJob.create).mockResolvedValue({
      id: "job_1",
      trigger: "EVENT_CREATE",
      status: "QUEUED",
      runs: [],
    } as never);

    await createEventPipelineJob(mockPrisma, {
      eventIds: ["evt_1"],
      stages: ["TAGGING", "EMBEDDING"],
      trigger: "EVENT_CREATE",
      requestedByUserId: "user_a",
    });

    expect(mockPrisma.eventPipelineJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger: "EVENT_CREATE",
          status: "QUEUED",
          requestedByUserId: "user_a",
          stages: ["TAGGING", "EMBEDDING"],
          runs: {
            create: [
              expect.objectContaining({
                eventId: "evt_1",
                stage: "TAGGING",
                status: "QUEUED",
              }),
              expect.objectContaining({
                eventId: "evt_1",
                stage: "EMBEDDING",
                status: "QUEUED",
              }),
            ],
          },
        }),
      }),
    );
  });

  it("TC-EMBED-002: regenerates the embedding and stores the new text hash when content changes", async () => {
    const event = makeEvent({
      description: "Updated live music lineup",
      embedding: {
        id: "ee_evt_1",
        eventId: "evt_1",
        textHash: "stale_hash",
      },
    });
    const job = {
      id: "job_1",
      status: "QUEUED",
      runs: [
        makeRun({
          event,
        }),
      ],
    };

    vi.mocked(mockPrisma.eventPipelineJob.findUnique).mockResolvedValue(job as never);
    vi.mocked(mockPrisma.eventPipelineJob.update).mockResolvedValue(job as never);
    vi.mocked(mockPrisma.eventPipelineRun.update).mockResolvedValue(makeRun() as never);
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(event as never);

    const generateEventEmbedding = vi.fn().mockResolvedValue({
      embedding: [0.12, 0.24, 0.36],
      textHash: "fresh_hash",
    });

    await executeEventPipelineJob(mockPrisma, {
      jobId: "job_1",
      generateEventEmbedding,
    });

    expect(generateEventEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Jazz Night",
        description: "Updated live music lineup",
        category: "music",
        tags: ["jazz", "live-music"],
      }),
      expect.anything(),
    );
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    expect(mockPrisma.eventPipelineRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run_1" },
        data: expect.objectContaining({
          status: "SUCCEEDED",
          textHash: "fresh_hash",
          error: null,
        }),
      }),
    );
  });

  it("TC-EMBED-003: skips embedding regeneration when the text hash is unchanged", async () => {
    const stableHash = await createEventEmbeddingTextHash({
      title: "Jazz Night",
      description: "Live music from student groups",
      category: "music",
      tags: ["jazz", "live-music"],
    });
    const event = makeEvent({
      embedding: {
        id: "ee_evt_1",
        eventId: "evt_1",
        textHash: stableHash,
      },
    });
    const job = {
      id: "job_1",
      status: "QUEUED",
      runs: [
        makeRun({
          event,
        }),
      ],
    };

    vi.mocked(mockPrisma.eventPipelineJob.findUnique).mockResolvedValue(job as never);
    vi.mocked(mockPrisma.eventPipelineJob.update).mockResolvedValue(job as never);
    vi.mocked(mockPrisma.eventPipelineRun.update).mockResolvedValue(makeRun() as never);
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(event as never);

    const generateEventEmbedding = vi.fn().mockResolvedValue({
      embedding: [0.12, 0.24, 0.36],
      textHash: stableHash,
    });

    await executeEventPipelineJob(mockPrisma, {
      jobId: "job_1",
      generateEventEmbedding,
    });

    expect(generateEventEmbedding).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    expect(mockPrisma.eventPipelineRun.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "run_1" },
        data: expect.objectContaining({
          status: "SKIPPED",
          textHash: stableHash,
          error: null,
        }),
      }),
    );
  });

  it("TC-EMBED-007: creates backfill runs only for events without embeddings", async () => {
    vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([
      { id: "evt_missing_1" },
      { id: "evt_missing_2" },
    ] as never);
    vi.mocked(mockPrisma.eventPipelineJob.create).mockResolvedValue({
      id: "job_backfill_1",
      trigger: "EMBEDDING_BACKFILL",
      status: "QUEUED",
      runs: [],
    } as never);

    await createEmbeddingBackfillJob(mockPrisma, {
      requestedByUserId: "admin_1",
    });

    expect(mockPrisma.eventPipelineJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger: "EMBEDDING_BACKFILL",
          stages: ["EMBEDDING"],
          requestedByUserId: "admin_1",
          runs: {
            create: [
              expect.objectContaining({
                eventId: "evt_missing_1",
                stage: "EMBEDDING",
              }),
              expect.objectContaining({
                eventId: "evt_missing_2",
                stage: "EMBEDDING",
              }),
            ],
          },
        }),
      }),
    );
  });
});
