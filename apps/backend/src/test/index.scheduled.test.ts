import { beforeEach, describe, expect, it, vi } from "vitest";

const { autoCompleteEvents, syncExternalEvents, runWithPrisma } = vi.hoisted(() => ({
  autoCompleteEvents: vi.fn(),
  syncExternalEvents: vi.fn(),
  runWithPrisma: vi.fn(
    async (_databaseUrl: string, operation: (prisma: unknown) => unknown) =>
      operation({}),
  ),
}));

vi.mock("../scheduled/auto-complete", () => ({
  autoCompleteEvents,
}));

vi.mock("../services/external-ingestion", () => ({
  syncExternalEvents,
}));

vi.mock("../lib/worker-runtime", () => ({
  runWithPrisma,
}));

import worker, { AUTO_COMPLETE_CRON, EXTERNAL_INGESTION_CRON } from "../index";

describe("[phase:4] [regression:always] Scheduled worker dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes the 15-minute cron to auto-complete", async () => {
    const waitUntil = vi.fn();

    await worker.scheduled?.(
      { cron: AUTO_COMPLETE_CRON } as ScheduledController,
      {
        DATABASE_URL: "postgresql://db",
        CLERK_SECRET_KEY: "clerk_secret",
        TICKETMASTER_API_KEY: "ticketmaster_secret",
      } as never,
      { waitUntil } as unknown as ExecutionContext,
    );

    expect(runWithPrisma).toHaveBeenCalledWith(
      "postgresql://db",
      autoCompleteEvents,
    );
    expect(autoCompleteEvents).toHaveBeenCalledTimes(1);
    expect(syncExternalEvents).not.toHaveBeenCalled();
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("routes the 6-hour cron to external ingestion", async () => {
    const waitUntil = vi.fn();

    await worker.scheduled?.(
      { cron: EXTERNAL_INGESTION_CRON } as ScheduledController,
      {
        DATABASE_URL: "postgresql://db",
        CLERK_SECRET_KEY: "clerk_secret",
        TICKETMASTER_API_KEY: "ticketmaster_secret",
      } as never,
      { waitUntil } as unknown as ExecutionContext,
    );

    expect(syncExternalEvents).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        ticketmasterApiKey: "ticketmaster_secret",
      }),
    );
    expect(autoCompleteEvents).not.toHaveBeenCalled();
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
