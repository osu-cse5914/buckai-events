import { createMiddleware } from "hono/factory";
import { getPrisma } from "../lib/prisma";
import type { AppEnv } from "../lib/types";

export const E2E_TEST_AUTH_HEADER = "x-social-osu-e2e-user-id";

function readEnabledFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

export function isE2ETestAuthEnabled(env?: Record<string, string | undefined>) {
  const envValue =
    env?.E2E_TEST_AUTH_ENABLED ??
    (typeof process !== "undefined" ? process.env.E2E_TEST_AUTH_ENABLED : undefined);

  return readEnabledFlag(envValue);
}

export const e2eTestAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!isE2ETestAuthEnabled(c.env as unknown as Record<string, string | undefined>)) {
    await next();
    return;
  }

  const userId = c.req.header(E2E_TEST_AUTH_HEADER)?.trim();
  if (!userId) {
    await next();
    return;
  }

  const prisma = getPrisma(c);
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user) {
    c.set("user", {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      role: user.role,
    });
  }

  await next();
});
