import type { PrismaClient } from "@prisma/client";

export type RecommendationInput = {
  userId: string;
  type?: "EVENT" | "GIG";
  limit: number;
  offset: number;
};

type EventWithInteractions = {
  id: string;
  type: "EVENT" | "GIG";
  category: string | null;
  startAt: Date;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  interactions?: Array<{
    userId: string;
    action: "VIEW" | "SAVE" | "CLICK" | "APPLY" | "DISMISS";
  }>;
};

function hasInterestMatch(interests: string[], category: string | null): boolean {
  if (!category) {
    return false;
  }

  const normalizedCategory = category.toLowerCase();
  return interests.some((interest) => interest.toLowerCase() === normalizedCategory);
}

function compareRecommendations(
  userInterests: string[],
  left: EventWithInteractions,
  right: EventWithInteractions,
): number {
  const leftInterestMatch = hasInterestMatch(userInterests, left.category) ? 1 : 0;
  const rightInterestMatch = hasInterestMatch(userInterests, right.category) ? 1 : 0;
  if (leftInterestMatch !== rightInterestMatch) {
    return rightInterestMatch - leftInterestMatch;
  }

  const leftPopularity = left.interactions?.length ?? 0;
  const rightPopularity = right.interactions?.length ?? 0;
  if (leftPopularity !== rightPopularity) {
    return rightPopularity - leftPopularity;
  }

  return left.startAt.getTime() - right.startAt.getTime();
}

export async function getRecommendations(
  prisma: PrismaClient,
  input: RecommendationInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { interests: true },
  });

  const events = (await prisma.event.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      startAt: { gt: new Date() },
      ...(input.type ? { type: input.type } : {}),
    },
    include: {
      interactions: {
        select: {
          userId: true,
          action: true,
        },
      },
    },
  })) as EventWithInteractions[];

  const ranked = events
    .filter(
      (event) =>
        !(event.interactions ?? []).some(
          (interaction) =>
            interaction.userId === input.userId && interaction.action === "DISMISS",
        ),
    )
    .sort((left, right) => compareRecommendations(user?.interests ?? [], left, right));

  return {
    data: ranked.slice(input.offset, input.offset + input.limit),
    total: ranked.length,
    limit: input.limit,
    offset: input.offset,
  };
}
