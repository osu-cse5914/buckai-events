import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../lib/problem-details";

export const CHATBOT_CONTEXT_WINDOW_LIMIT = 20;

export async function getConversationForUserOrThrow(
  prisma: PrismaClient,
  conversationId: string,
  userId: string,
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== userId) {
    throw new NotFoundError("Conversation not found");
  }

  return conversation;
}

export async function createConversationMessage(
  prisma: PrismaClient,
  input: {
    conversationId: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
  },
) {
  return prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    },
  });
}

export async function listRecentConversationMessages(
  prisma: PrismaClient,
  conversationId: string,
  limit = CHATBOT_CONTEXT_WINDOW_LIMIT,
) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return [...messages].reverse();
}
