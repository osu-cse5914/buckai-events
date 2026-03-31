/// <reference path="../worker-configuration.d.ts" />

import { app } from "./app";
import { autoCompleteEvents } from "./scheduled/auto-complete";
import { ensureClerkPublishableKey } from "./lib/clerk";
import { runWithPrisma } from "./lib/worker-runtime";
import type { WorkerBindings } from "./lib/types";
import { syncExternalEvents } from "./services/external-ingestion";

export const AUTO_COMPLETE_CRON = "*/15 * * * *";
export const EXTERNAL_INGESTION_CRON = "0 */6 * * *";

// Compatible with both Bun (reads `port`) and CF Workers (ignores `port`, uses `fetch`)
ensureClerkPublishableKey();
export { app } from "./app";
export type { AppType } from "./app";

const worker = {
  port: typeof process !== "undefined" ? Number(process.env.PORT ?? 3001) : 3001,
  fetch(request: Request, env: WorkerBindings, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // API routes handled by Hono
    if (url.pathname.startsWith("/api")) {
      return app.fetch(request, env, ctx);
    }

    // CF Workers: serve static assets with SPA fallback
    if ("ASSETS" in env) {
      const assets = env.ASSETS as { fetch(req: Request): Promise<Response> };
      return assets.fetch(request);
    }

    // Local dev: Hono handles everything (Vite proxies /api to here)
    return app.fetch(request, env, ctx);
  },

  // Cloudflare Workers cron trigger — run scheduled jobs by cron expression
  async scheduled(
    event: ScheduledController,
    env: WorkerBindings,
    ctx: ExecutionContext,
  ) {
    if (event.cron === AUTO_COMPLETE_CRON) {
      ctx.waitUntil(runWithPrisma(env.DATABASE_URL, autoCompleteEvents));
      return;
    }

    if (event.cron === EXTERNAL_INGESTION_CRON) {
      ctx.waitUntil(
        runWithPrisma(env.DATABASE_URL, (prisma) =>
          syncExternalEvents(prisma, {
            ticketmasterApiKey: env.TICKETMASTER_API_KEY,
          }),
        ),
      );
    }
  },
} satisfies ExportedHandler<WorkerBindings> & { port: number };

export default worker;
