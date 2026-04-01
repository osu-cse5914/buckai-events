import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

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
