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

type RecommendationListResult = {
  items: Array<ReturnType<typeof stripInteractionCounts>>;
  total: number;
  limit: number;
  offset: number;
};

type RecommendationContext = {
  user: {
    id: string;
    interests: string[];
  };
  dismissedEventIds: Set<string>;
  userInteractionCount: number;
  candidates: RecommendationCandidate[];
};

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

function comparePopularRecommendationCandidates(
  left: RecommendationCandidate,
  right: RecommendationCandidate,
) {
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

function compareUpcomingRecommendationCandidates(
  left: RecommendationCandidate,
  right: RecommendationCandidate,
) {
  const recencyDiff = left.startAt.getTime() - right.startAt.getTime();
  if (recencyDiff !== 0) {
    return recencyDiff;
  }

  const popularityDiff = right.interactions.length - left.interactions.length;
  if (popularityDiff !== 0) {
    return popularityDiff;
  }

  return left.id.localeCompare(right.id);
}

async function loadRecommendationContext(
  prisma: PrismaClient,
  input: RecommendationListInput,
): Promise<RecommendationContext> {
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

  return {
    user,
    dismissedEventIds: new Set(
      dismissedInteractions.map((interaction) => interaction.eventId),
    ),
    userInteractionCount,
    candidates: rawCandidates,
  };
}

function rankRecommendationCandidates(
  candidates: RecommendationCandidate[],
  input: RecommendationListInput,
  dismissedEventIds: Set<string>,
  compare: (left: RecommendationCandidate, right: RecommendationCandidate) => number,
) {
  const now = input.now ?? new Date();

  return candidates
    .filter((candidate) => isEligibleCandidate(candidate, { now, type: input.type }))
    .filter((candidate) => !dismissedEventIds.has(candidate.id))
    .sort(compare);
}

function paginateRecommendationCandidates(
  candidates: RecommendationCandidate[],
  input: RecommendationListInput,
): RecommendationListResult {
  const pagedCandidates = candidates.slice(input.offset, input.offset + input.limit);

  return {
    items: pagedCandidates.map(stripInteractionCounts),
    total: candidates.length,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function listRecommendations(
  prisma: PrismaClient,
  input: RecommendationListInput,
) {
  const context = await loadRecommendationContext(prisma, input);
  const rankedCandidates = rankRecommendationCandidates(
    context.candidates,
    input,
    context.dismissedEventIds,
    (left, right) =>
      compareRecommendationCandidates(left, right, context.user.interests),
  );
  const result = paginateRecommendationCandidates(rankedCandidates, input);
  const rankingMode: RecommendationRankingMode =
    context.user.interests.length === 0 && context.userInteractionCount === 0
      ? "POPULARITY_FALLBACK"
      : "PERSONALIZED";

  return {
    ...result,
    rankingMode,
  };
}

export async function listPopularRecommendations(
  prisma: PrismaClient,
  input: RecommendationListInput,
) {
  const context = await loadRecommendationContext(prisma, input);
  const rankedCandidates = rankRecommendationCandidates(
    context.candidates,
    input,
    context.dismissedEventIds,
    comparePopularRecommendationCandidates,
  );

  return paginateRecommendationCandidates(rankedCandidates, input);
}

export async function listUpcomingRecommendations(
  prisma: PrismaClient,
  input: RecommendationListInput,
) {
  const context = await loadRecommendationContext(prisma, input);
  const rankedCandidates = rankRecommendationCandidates(
    context.candidates,
    input,
    context.dismissedEventIds,
    compareUpcomingRecommendationCandidates,
  );

  return paginateRecommendationCandidates(rankedCandidates, input);
}
