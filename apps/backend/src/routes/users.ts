import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import { paginated } from "../lib/pagination";
import {
  parseUserPatchBody,
  readJsonBody,
  resolvePaginationQuery,
  validatePaginationQuery,
  validateStrictPaginationQuery,
  validateUserIdParam,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
import {
  getCurrentUserOrThrow,
  getPublicProfile,
  listOwnApplications,
  updateCurrentUser,
} from "../services/users";
import {
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing,
} from "../services/social";

function readClerkProfileExtras(clerkUser?: {
  imageUrl?: string | null;
  publicMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
}) {
  const metadataPronouns =
    clerkUser?.publicMetadata?.pronouns ?? clerkUser?.unsafeMetadata?.pronouns;

  return {
    imageUrl: clerkUser?.imageUrl ?? null,
    pronouns: typeof metadataPronouns === "string" ? metadataPronouns : null,
  };
}

async function loadClerkProfileExtras(c: { get: (key: string) => any }, clerkId: string) {
  const clerk = c.get("clerk");
  const clerkUser = await clerk.users.getUser(clerkId);
  return readClerkProfileExtras(clerkUser);
}

async function enrichUsersWithClerkImages(
  c: { get: (key: string) => any },
  users: Array<{ id: string; clerkId?: string | null; displayName: string | null; major: string | null; gradYear: number | null }>,
) {
  const clerk = c.get("clerk");

  return Promise.all(
    users.map(async (user) => {
      const clerkUser = user.clerkId ? await clerk.users.getUser(user.clerkId) : undefined;
      const extras = readClerkProfileExtras(clerkUser);

      return {
        id: user.id,
        displayName: user.displayName,
        major: user.major,
        gradYear: user.gradYear,
        imageUrl: extras.imageUrl,
      };
    }),
  );
}

export const users = new Hono<AppEnv>()
  .get("/me/applications", validatePaginationQuery, async (c) => {
    const { id } = c.get("user");
    const prisma = getPrisma(c);
    const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));

    const result = await listOwnApplications(prisma, {
      applicantId: id,
      limit,
      offset,
    });

    return c.json(
      paginated(result.data, {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      }),
    );
  })
  .get("/me", async (c) => {
    const { id, clerkId } = c.get("user");
    const prisma = getPrisma(c);
    const user = await getCurrentUserOrThrow(prisma, id);
    const clerkProfile = await loadClerkProfileExtras(c, clerkId);
    return c.json({
      ...user,
      imageUrl: clerkProfile.imageUrl,
      pronouns: clerkProfile.pronouns,
    });
  })
  .patch("/me", async (c) => {
    const { id } = c.get("user");
    const data = parseUserPatchBody(await readJsonBody(c), c);
    if (data instanceof Response) {
      return data;
    }
    const prisma = getPrisma(c);
    const updated = await updateCurrentUser(prisma, id, data);
    return c.json(updated);
  })
  .get("/:id", validateUserIdParam, validateStrictPaginationQuery, async (c) => {
    const { id: authUserId } = c.get("user");
    const { id: targetId } = c.req.valid("param");
    const { limit, offset } = resolvePaginationQuery(c.req.valid("query"), {
      strict: true,
    });
    const prisma = getPrisma(c);

    const profile = await getPublicProfile(prisma, {
      authUserId,
      targetId,
      limit,
      offset,
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { clerkId: true },
    });
    if (!targetUser) {
      throw new Error("Target user vanished while loading Clerk profile metadata");
    }
    const clerkProfile = await loadClerkProfileExtras(c, targetUser.clerkId);

    return c.json({
      ...profile,
      imageUrl: clerkProfile.imageUrl,
      pronouns: clerkProfile.pronouns,
    });
  })
  .post("/:id/follow", validateUserIdParam, async (c) => {
    const { id: followerId } = c.get("user");
    const { id: followeeId } = c.req.valid("param");
    const prisma = getPrisma(c);
    await followUser(prisma, { followerId, followeeId });
    return c.json({}, 201);
  })
  .delete("/:id/follow", validateUserIdParam, async (c) => {
    const { id: followerId } = c.get("user");
    const { id: followeeId } = c.req.valid("param");
    const prisma = getPrisma(c);
    await unfollowUser(prisma, { followerId, followeeId });
    return c.body(null, 204);
  })
  .get("/:id/followers", validateUserIdParam, validatePaginationQuery, async (c) => {
    const { id: userId } = c.req.valid("param");
    const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));
    const prisma = getPrisma(c);
    const result = await listFollowers(prisma, { userId, limit, offset });
    const data = await enrichUsersWithClerkImages(c, result.data as Array<any>);
    return c.json(paginated(data, { total: result.total, limit: result.limit, offset: result.offset }));
  })
  .get("/:id/following", validateUserIdParam, validatePaginationQuery, async (c) => {
    const { id: userId } = c.req.valid("param");
    const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));
    const prisma = getPrisma(c);
    const result = await listFollowing(prisma, { userId, limit, offset });
    const data = await enrichUsersWithClerkImages(c, result.data as Array<any>);
    return c.json(paginated(data, { total: result.total, limit: result.limit, offset: result.offset }));
  });
