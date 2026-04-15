import { Prisma, type PrismaClient } from "@prisma/client";
import { NotFoundError } from "../lib/problem-details";
import type { ChatMessagePart } from "./chat-message-parts";

export const CHATBOT_CONTEXT_WINDOW_LIMIT = 20;

export async function createConversation(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.conversation.create({
    data: {
      userId,
      title: null,
    },
  });
}

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

export async function deleteConversationForUser(
  prisma: PrismaClient,
  input: {
    conversationId: string;
    userId: string;
  },
) {
  await getConversationForUserOrThrow(prisma, input.conversationId, input.userId);

  await prisma.conversation.delete({
    where: { id: input.conversationId },
  });
}

export async function listUserConversations(
  prisma: PrismaClient,
  input: {
    userId: string;
    limit: number;
    offset: number;
  },
) {
  const where = { userId: input.userId };
  const [data, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: input.limit,
      skip: input.offset,
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    data,
    total,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function createConversationMessage(
  prisma: PrismaClient,
  input: {
    conversationId: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    parts?: ChatMessagePart[];
  },
) {
  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      ...(input.parts?.length
        ? {
            parts: input.parts as Prisma.InputJsonValue,
          }
        : {}),
    },
  });

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
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

export async function listConversationMessagesForUser(
  prisma: PrismaClient,
  input: {
    conversationId: string;
    userId: string;
    limit: number;
    offset: number;
  },
) {
  await getConversationForUserOrThrow(prisma, input.conversationId, input.userId);

  const where = { conversationId: input.conversationId };
  const [data, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: input.limit,
      skip: input.offset,
    }),
    prisma.message.count({ where }),
  ]);

  return {
    data,
    total,
    limit: input.limit,
    offset: input.offset,
  };
}
