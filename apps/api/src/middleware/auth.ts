import { createMiddleware } from "hono/factory";
import { getAuth } from "@hono/clerk-auth";
import { getPrismaClient } from "../lib/prisma";

type AuthUser = {
  id: string;
  clerkId: string;
  email: string;
};

type AuthEnv = {
  Variables: { user: AuthUser };
};

/**
 * Requires a valid Clerk JWT and auto-provisions a User row on first auth.
 * Must be applied AFTER clerkMiddleware().
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = getAuth(c);
  const clerkId = auth?.userId;

  if (!clerkId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const connectionString =
    (c.env as Record<string, string>)?.DATABASE_URL ??
    (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined);
  const prisma = getPrismaClient(connectionString);

  let user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    const clerk = c.get("clerk");
    const clerkUser = await clerk.users.getUser(clerkId);
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return c.json({ error: "No email associated with account" }, 400);
    }

    user = await prisma.user.create({ data: { clerkId, email } });
  }

  c.set("user", { id: user.id, clerkId: user.clerkId, email: user.email });
  await next();
});
