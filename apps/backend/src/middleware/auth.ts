import { createMiddleware } from "hono/factory";
import { getAuth } from "@hono/clerk-auth";
import { Prisma } from "@prisma/client";
import type { AppEnv } from "../lib/types";
import { getPrisma } from "../lib/prisma";
import { badRequest, forbidden, unauthorized } from "../lib/problem-details";

const ALLOWED_EMAIL_DOMAINS = ["osu.edu", "buckeyemail.osu.edu"];

function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((allowed) => domain === allowed);
}

/**
 * Requires a valid Clerk JWT and auto-provisions a User row on first auth.
 * Must be applied AFTER clerkMiddleware().
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const existingUser = c.get("user") as AppEnv["Variables"]["user"] | undefined;
  if (existingUser) {
    await next();
    return;
  }

  const auth = getAuth(c);
  const clerkId = auth?.userId;

  if (!clerkId) {
    return unauthorized(c);
  }

  const prisma = getPrisma(c);

  let user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    const clerk = c.get("clerk");
    const clerkUser = await clerk.users.getUser(clerkId);
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return badRequest(c, "No email associated with account");
    }

    if (!isAllowedEmailDomain(email)) {
      return forbidden(
        c,
        "Email domain not allowed. Only @osu.edu and @buckeyemail.osu.edu addresses are permitted.",
      );
    }

    try {
      user = await prisma.user.create({ data: { clerkId, email, role: "USER" } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        user = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
      } else {
        throw e;
      }
    }
  }

  c.set("user", {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    role: user.role,
  });
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("user").role !== "ADMIN") {
    return forbidden(c, "Admin access is required");
  }

  await next();
});
