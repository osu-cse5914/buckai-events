import type { PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import { getPrismaClient } from "./prisma";
import type { AppEnv } from "./types";

type PrismaFactory = (connectionString?: string) => PrismaClient;

function getExecutionContext(
  c: Context<AppEnv>,
): { waitUntil(promise: Promise<unknown>): void } | undefined {
  try {
    return (
      c as Context<AppEnv> & {
        executionCtx?: { waitUntil(promise: Promise<unknown>): void };
      }
    ).executionCtx;
  } catch {
    return undefined;
  }
}

export function resolveConnectionString(
  env?: { DATABASE_URL?: unknown } | undefined,
): string | undefined {
  const databaseUrl = env?.DATABASE_URL;
  if (typeof databaseUrl === "string" && databaseUrl.length > 0) {
    return databaseUrl;
  }

  return typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
}

export function trackBackgroundTask(
  c: Context<AppEnv>,
  task: Promise<unknown>,
  label: string,
): void {
  const handledTask = task.catch((error) => {
    console.error(`Failed to ${label}`, error);
  });

  const backgroundTasks = c.get("backgroundTasks");
  if (backgroundTasks) {
    backgroundTasks.push(handledTask);
    return;
  }

  const executionCtx = getExecutionContext(c);
  if (executionCtx) {
    executionCtx.waitUntil(handledTask);
    return;
  }

  void handledTask;
}

export function dispatchDetachedTask(
  c: Context<AppEnv>,
  task: Promise<unknown>,
  label: string,
): void {
  const handledTask = task.catch((error) => {
    console.error(`Failed to ${label}`, error);
  });

  const executionCtx = getExecutionContext(c);
  if (executionCtx) {
    executionCtx.waitUntil(handledTask);
    return;
  }

  void handledTask;
}

export async function drainRequestResources(
  c: Context<AppEnv>,
  prisma: PrismaClient,
): Promise<void> {
  const backgroundTasks = c.get("backgroundTasks") ?? [];
  const teardown = Promise.allSettled(backgroundTasks).then(async () => {
    await prisma.$disconnect();
  });

  const executionCtx = getExecutionContext(c);
  if (executionCtx) {
    executionCtx.waitUntil(teardown);
    return;
  }

  await teardown;
}

export async function runWithPrisma<T>(
  connectionString: string | undefined,
  operation: (prisma: PrismaClient) => Promise<T>,
  prismaFactory: PrismaFactory = getPrismaClient,
): Promise<T> {
  const prisma = prismaFactory(connectionString);

  try {
    return await operation(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
