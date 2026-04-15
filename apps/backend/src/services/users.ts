import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../lib/problem-details";

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

export async function getPublicProfile(prisma: PrismaClient, input: PublicProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: input.targetId } });
  if (!user) {
    throw new NotFoundError(`User ${input.targetId} was not found`);
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

export async function getCurrentUserOrThrow(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}

export async function updateCurrentUser(
  prisma: PrismaClient,
  userId: string,
  data: UpdateOwnProfileInput,
) {
  return prisma.user.update({ where: { id: userId }, data });
}
