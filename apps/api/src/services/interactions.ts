import type { InteractionType, PrismaClient } from "@prisma/client";
import { NotFoundError } from "../lib/problem-details";

export async function createInteraction(
  prisma: PrismaClient,
  input: {
    userId: string;
    eventId: string;
    action: InteractionType;
  },
) {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  return prisma.interaction.create({
    data: {
      userId: input.userId,
      eventId: input.eventId,
      action: input.action,
    },
  });
}
