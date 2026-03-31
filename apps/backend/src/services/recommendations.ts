import type { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "../lib/problem-details";
import { CREATOR_SELECT, type EventType } from "./events";

export type RecommendationRankingMode =
  | "PERSONALIZED"
  | "POPULARITY_FALLBACK";

type RecommendationListInput = {
  userId: string;
  type?: EventType;
  limit: number;
  offset: number;
  now?: Date;
};

const RECOMMENDATION_EVENT_INCLUDE = {
  creator: { select: CREATOR_SELECT },
  interactions: { select: { id: true } },
} satisfies Prisma.EventInclude;

type RecommendationCandidate = Prisma.EventGetPayload<{
  include: typeof RECOMMENDATION_EVENT_INCLUDE;
}>;

function isEligibleCandidate(
  candidate: RecommendationCandidate,
  {
    now,
    type,
  }: {
    now: Date;
    type?: EventType;
  },
) {
  if (type && candidate.type !== type) {
    return false;
  }

  if (candidate.status !== "OPEN" && candidate.status !== "IN_PROGRESS") {
    return false;
  }

  return candidate.startAt > now;
}

function stripInteractionCounts(candidate: RecommendationCandidate) {
  const event = { ...candidate };
  Reflect.deleteProperty(event, "interactions");
  return event;
}

function compareRecommendationCandidates(
  left: RecommendationCandidate,
  right: RecommendationCandidate,
  interests: string[],
) {
  const leftInterestMatch =
    left.category !== null && interests.includes(left.category) ? 1 : 0;
  const rightInterestMatch =
    right.category !== null && interests.includes(right.category) ? 1 : 0;
  if (leftInterestMatch !== rightInterestMatch) {
    return rightInterestMatch - leftInterestMatch;
  }

  const popularityDiff = right.interactions.length - left.interactions.length;
  if (popularityDiff !== 0) {
    return popularityDiff;
  }

  const recencyDiff = left.startAt.getTime() - right.startAt.getTime();
  if (recencyDiff !== 0) {
    return recencyDiff;
  }

  return left.id.localeCompare(right.id);
}

export async function listRecommendations(
  prisma: PrismaClient,
  input: RecommendationListInput,
) {
  const now = input.now ?? new Date();
  const [user, dismissedInteractions, userInteractionCount, rawCandidates] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          interests: true,
        },
      }),
      prisma.interaction.findMany({
        where: {
          userId: input.userId,
          action: "DISMISS",
        },
        select: {
          eventId: true,
        },
      }),
      prisma.interaction.count({
        where: {
          userId: input.userId,
        },
      }),
      prisma.event.findMany({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          startAt: { gt: now },
          ...(input.type ? { type: input.type } : {}),
        },
        include: RECOMMENDATION_EVENT_INCLUDE,
      }),
    ]);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const dismissedEventIds = new Set(
    dismissedInteractions.map((interaction) => interaction.eventId),
  );
  const rankedCandidates = rawCandidates
    .filter((candidate) => isEligibleCandidate(candidate, { now, type: input.type }))
    .filter((candidate) => !dismissedEventIds.has(candidate.id))
    .sort((left, right) =>
      compareRecommendationCandidates(left, right, user.interests),
    );

  const pagedCandidates = rankedCandidates.slice(
    input.offset,
    input.offset + input.limit,
  );
  const rankingMode: RecommendationRankingMode =
    user.interests.length === 0 && userInteractionCount === 0
      ? "POPULARITY_FALLBACK"
      : "PERSONALIZED";

  return {
    items: pagedCandidates.map(stripInteractionCounts),
    total: rankedCandidates.length,
    limit: input.limit,
    offset: input.offset,
    rankingMode,
  };
}
