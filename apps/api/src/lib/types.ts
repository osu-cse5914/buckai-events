/// <reference path="../../worker-configuration.d.ts" />

import type { PrismaClient, UserRole } from "@prisma/client";

export type WorkerBindings = Env & {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  TICKETMASTER_API_KEY?: string;
};

export type AppEnv = {
  Bindings: WorkerBindings;
  Variables: {
    prisma?: PrismaClient;
    backgroundTasks?: Promise<unknown>[];
    user: { id: string; clerkId: string; email: string; role: UserRole };
  };
};
