import { Hono } from "hono";
import type { PrismaClient } from "@prisma/client";
import { createRequestResourcesMiddleware } from "../../../middleware/request-resources";
import { getPrisma } from "../../../lib/prisma";
import { trackBackgroundTask } from "../../../lib/worker-runtime";
import type { AppEnv, WorkerBindings } from "../../../lib/types";

const lifecycle: string[] = [];

function createFakePrisma(): PrismaClient {
  return {
    $disconnect: async () => {
      lifecycle.push("disconnect");
    },
  } as unknown as PrismaClient;
}

const app = new Hono<AppEnv>();

app.use(
  "/api/runtime",
  createRequestResourcesMiddleware(() => createFakePrisma()),
);

app.post("/api/runtime", async (c) => {
  getPrisma(c);
  lifecycle.push("handler");

  trackBackgroundTask(
    c,
    Promise.resolve().then(() => {
      lifecycle.push("background");
    }),
    "run request runtime fixture task",
  );

  return c.json({ ok: true });
});

app.get("/state", (c) => c.json({ lifecycle }));

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<WorkerBindings>;
