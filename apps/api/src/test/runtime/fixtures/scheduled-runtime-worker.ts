import type { PrismaClient } from "@prisma/client";
import type { WorkerBindings } from "../../../lib/types";
import { runWithPrisma } from "../../../lib/worker-runtime";

const lifecycle: string[] = [];

function createFakePrisma(): PrismaClient {
  return {
    $disconnect: async () => {
      lifecycle.push("disconnect");
    },
  } as unknown as PrismaClient;
}

export default {
  async fetch() {
    return Response.json({ lifecycle });
  },
  async scheduled(_event: ScheduledController, _env: WorkerBindings, ctx: ExecutionContext) {
    ctx.waitUntil(
      runWithPrisma(
        "postgresql://ignored",
        async () => {
          lifecycle.push("scheduled");
        },
        () => createFakePrisma(),
      ),
    );
  },
} satisfies ExportedHandler<WorkerBindings>;
