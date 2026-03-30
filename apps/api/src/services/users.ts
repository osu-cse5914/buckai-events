import type { PrismaClient } from "@prisma/client";

export type UsersListOwnApplicationsInput = {
  applicantId: string;
  limit: number;
  offset: number;
};

export type UpdateOwnProfileInput = Record<string, unknown>;

export type PublicProfileInput = {
  authUserId: string;
  targetId: string;
  limit: number;
  offset: number;
};

export async function listOwnApplications(
  prisma: PrismaClient,
  input: UsersListOwnApplicationsInput,
) {
  const where = { applicantId: input.applicantId };
  const [data, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        gig: {
          select: {
            id: true,
            title: true,
            status: true,
            startAt: true,
            locationName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
    }),
    prisma.application.count({ where }),
  ]);

  return {
    data,
    total,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function getPublicProfile(
  prisma: PrismaClient,
  input: PublicProfileInput,
) {
  const user = await prisma.user.findUnique({ where: { id: input.targetId } });
  if (!user) {
    return null;
  }

  const [events, eventCount, follow] = await Promise.all([
    prisma.event.findMany({
      where: {
        creatorId: input.targetId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      take: input.limit,
      skip: input.offset,
    }),
    prisma.event.count({
      where: {
        creatorId: input.targetId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId: input.authUserId,
          followeeId: input.targetId,
        },
      },
    }),
  ]);

  return {
    id: user.id,
    displayName: user.displayName,
    major: user.major,
    gradYear: user.gradYear,
    interests: user.interests,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    createdAt: user.createdAt,
    isFollowing: !!follow,
    createdEvents: {
      items: events,
      meta: {
        total: eventCount,
        limit: input.limit,
        offset: input.offset,
      },
    },
  };
}
