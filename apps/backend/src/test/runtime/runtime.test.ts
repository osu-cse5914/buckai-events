import { afterEach, describe, expect, it } from "vitest";
import { unstable_startWorker } from "wrangler";

type RuntimeWorker = Awaited<ReturnType<typeof unstable_startWorker>>;

const workers: RuntimeWorker[] = [];
const runtimeConfig = new URL("../../../wrangler.runtime.toml", import.meta.url)
  .pathname;

async function startRuntimeWorker(entrypoint: string) {
  const worker = await unstable_startWorker({
    name: "social-osu-api-runtime-test",
    config: runtimeConfig,
    entrypoint,
    compatibilityDate: "2025-03-01",
    compatibilityFlags: ["nodejs_compat"],
    build: {
      bundle: true,
    },
    dev: {
      remote: false,
      watch: false,
      liveReload: false,
      testScheduled: true,
      generateTypes: false,
    },
  });

  await worker.ready;
  workers.push(worker);
  return worker;
}

async function pause(ms = 50) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

afterEach(async () => {
  while (workers.length > 0) {
    const worker = workers.pop();
    if (worker) {
      await worker.dispose();
    }
  }
});

describe("[phase:2] [regression:always] Request runtime helpers", () => {
  it("TC-APP-013: request-scoped resources drain background tasks before disconnect", async () => {
    const worker = await startRuntimeWorker(
      new URL("./fixtures/request-runtime-worker.ts", import.meta.url).pathname,
    );

    const response = await worker.fetch("http://localhost/api/runtime", {
      method: "POST",
    });
    expect(response.status).toBe(200);

    await pause();

    const stateResponse = await worker.fetch("http://localhost/state");
    const state = (await stateResponse.json()) as { lifecycle: string[] };
    expect(state.lifecycle).toEqual(["handler", "background", "disconnect"]);
  });
});

describe("[phase:1] [regression:always] Scheduled runtime helpers", () => {
  it("TC-EVT-010: scheduled helper disconnects Prisma after the job completes", async () => {
    const worker = await startRuntimeWorker(
      new URL("./fixtures/scheduled-runtime-worker.ts", import.meta.url).pathname,
    );

    const scheduledResponse = await worker.fetch(
      "http://localhost/__scheduled?cron=*/15+*+*+*+*",
      {
        method: "POST",
      },
    );
    expect(scheduledResponse.status).toBe(200);

    await pause();

    const stateResponse = await worker.fetch("http://localhost/");
    const state = (await stateResponse.json()) as { lifecycle: string[] };
    expect(state.lifecycle).toEqual(["scheduled", "disconnect"]);
  });
});
