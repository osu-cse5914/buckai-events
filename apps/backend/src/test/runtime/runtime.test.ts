import type { PrismaClient } from "@prisma/client";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createRequestResourcesMiddleware } from "../../middleware/request-resources";
import { runWithPrisma, trackBackgroundTask } from "../../lib/worker-runtime";
import type { AppEnv } from "../../lib/types";

describe("[phase:2] [regression:always] Request runtime helpers", () => {
  it("TC-APP-013: request-scoped resources drain background tasks before disconnect", async () => {
    const lifecycle: string[] = [];
    const createFakePrisma = () =>
      ({
        $disconnect: async () => {
          lifecycle.push("disconnect");
        },
      }) as PrismaClient;
    const app = new Hono<AppEnv>();

    app.use(
      "/api/runtime",
      createRequestResourcesMiddleware(() => createFakePrisma()),
    );
    app.post("/api/runtime", async (c) => {
      c.get("prisma");
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

    const response = await app.request("http://localhost/api/runtime", {
      method: "POST",
    });
    expect(response.status).toBe(200);
    expect(lifecycle).toEqual(["handler", "background", "disconnect"]);
  });
});

describe("[phase:1] [regression:always] Scheduled runtime helpers", () => {
  it("TC-EVT-010: scheduled helper disconnects Prisma after the job completes", async () => {
    const lifecycle: string[] = [];

    await runWithPrisma(
      "postgresql://ignored",
      async () => {
        lifecycle.push("scheduled");
      },
      () =>
        ({
          $disconnect: async () => {
            lifecycle.push("disconnect");
          },
        }) as PrismaClient,
    );

    expect(lifecycle).toEqual(["scheduled", "disconnect"]);
  });
});
