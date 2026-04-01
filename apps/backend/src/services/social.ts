import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/problem-details";

export type ListSocialFeedInput = {
  viewerId: string;
  limit: number;
  offset: number;
};

type SocialFeedRow = {
  event: Record<string, unknown>;
  action: "created" | "saved";
  actor: {
    id: string;
    displayName: string | null;
  };
  actionAt: string;
};

export async function listSocialFeed(
  prisma: PrismaClient,
  input: ListSocialFeedInput,
) {
  const rows = await prisma.$queryRaw<SocialFeedRow[]>(Prisma.sql`
    WITH followed_users AS (
      SELECT "followeeId"
      FROM "Follow"
      WHERE "followerId" = ${input.viewerId}
    ),
    created_events AS (
      SELECT
        jsonb_build_object(
          'id', e.id,
          'title', e.title,
          'source', e.source,
          'type', e.type,
          'status', e.status
        ) AS event,
        'created'::text AS action,
        jsonb_build_object(
          'id', u.id,
          'displayName', u."displayName"
        ) AS actor,
        e."createdAt" AS "actionAt"
      FROM "Event" e
      INNER JOIN followed_users f ON f."followeeId" = e."creatorId"
      INNER JOIN "User" u ON u.id = e."creatorId"
      WHERE e.source = 'USER'
    ),
    saved_events AS (
      SELECT
        jsonb_build_object(
          'id', e.id,
          'title', e.title,
          'source', e.source,
          'type', e.type,
          'status', e.status
        ) AS event,
        'saved'::text AS action,
        jsonb_build_object(
          'id', u.id,
          'displayName', u."displayName"
        ) AS actor,
        ci."createdAt" AS "actionAt"
      FROM "CollectionItem" ci
      INNER JOIN "Collection" c ON c.id = ci."collectionId"
      INNER JOIN followed_users f ON f."followeeId" = c."userId"
      INNER JOIN "User" u ON u.id = c."userId"
      INNER JOIN "Event" e ON e.id = ci."eventId"
      WHERE c.visibility = 'PUBLIC'
    ),
    feed_rows AS (
      SELECT * FROM created_events
      UNION ALL
      SELECT * FROM saved_events
    )
    SELECT *
    FROM feed_rows
    ORDER BY "actionAt" DESC
    LIMIT ${input.limit}
    OFFSET ${input.offset}
  `);

  const countRows = await prisma.$queryRaw<Array<{ total: number | bigint }>>(
    Prisma.sql`
      WITH followed_users AS (
        SELECT "followeeId"
        FROM "Follow"
        WHERE "followerId" = ${input.viewerId}
      ),
      created_count AS (
        SELECT COUNT(*)::bigint AS total
        FROM "Event" e
        INNER JOIN followed_users f ON f."followeeId" = e."creatorId"
        WHERE e.source = 'USER'
      ),
      saved_count AS (
        SELECT COUNT(*)::bigint AS total
        FROM "CollectionItem" ci
        INNER JOIN "Collection" c ON c.id = ci."collectionId"
        INNER JOIN followed_users f ON f."followeeId" = c."userId"
        WHERE c.visibility = 'PUBLIC'
      )
      SELECT (
        COALESCE((SELECT total FROM created_count), 0) +
        COALESCE((SELECT total FROM saved_count), 0)
      )::bigint AS total
    `,
  );

  const totalValue = countRows[0]?.total ?? 0;

  return {
    data: rows,
    total: typeof totalValue === "bigint" ? Number(totalValue) : totalValue,
    limit: input.limit,
    offset: input.offset,
  };
}

export type FollowInput = {
  followerId: string;
  followeeId: string;
};

export type ListFollowInput = {
  userId: string;
  limit: number;
  offset: number;
};

export async function followUser(prisma: PrismaClient, input: FollowInput) {
  const { followerId, followeeId } = input;

  if (followerId === followeeId) {
    throw new BadRequestError("You cannot follow yourself");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: followeeId } });
  if (!targetUser) {
    throw new NotFoundError(`User ${followeeId} was not found`);
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId, followeeId } },
  });
  if (existing) {
    throw new ConflictError("You are already following this user");
  }

  await prisma.$transaction([
    prisma.follow.create({ data: { followerId, followeeId } }),
    prisma.user.update({ where: { id: followeeId }, data: { followerCount: { increment: 1 } } }),
    prisma.user.update({ where: { id: followerId }, data: { followingCount: { increment: 1 } } }),
  ]);
}

export async function unfollowUser(prisma: PrismaClient, input: FollowInput) {
  const { followerId, followeeId } = input;

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId, followeeId } },
  });
  if (!existing) {
    throw new NotFoundError("You are not following this user");
  }

  await prisma.$transaction([
    prisma.follow.delete({ where: { followerId_followeeId: { followerId, followeeId } } }),
    prisma.user.update({ where: { id: followeeId }, data: { followerCount: { decrement: 1 } } }),
    prisma.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } }),
  ]);
}

export async function listFollowers(prisma: PrismaClient, input: ListFollowInput) {
  const { userId, limit, offset } = input;

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followeeId: userId },
      include: {
        follower: { select: { id: true, displayName: true, major: true, gradYear: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.follow.count({ where: { followeeId: userId } }),
  ]);

  return {
    data: follows.map((f) => f.follower),
    total,
    limit,
    offset,
  };
}

export async function listFollowing(prisma: PrismaClient, input: ListFollowInput) {
  const { userId, limit, offset } = input;

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        followee: { select: { id: true, displayName: true, major: true, gradYear: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  return {
    data: follows.map((f) => f.followee),
    total,
    limit,
    offset,
  };
}
