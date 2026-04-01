import { Hono } from "hono";
import { getPrisma } from "../lib/prisma";
import {
  parsePendingChatAction,
  cancelPendingChatAction,
  createChatbotStreamResponse,
  createStaticSseTextResponse,
  executePendingChatAction,
  interpretPendingActionDecision,
} from "../services/chatbot";
import {
  createConversationMessage,
  getConversationForUserOrThrow,
  listRecentConversationMessages,
} from "../services/conversations";
import { readJsonBody, validateConversationIdParam, parseSendMessageBody } from "../lib/validators";
import type { AppEnv } from "../lib/types";

type ConversationsRouteOptions = {
  streamText?: Parameters<typeof createChatbotStreamResponse>[0]["streamText"];
  searchSemanticEvents?: Parameters<
    typeof createChatbotStreamResponse
  >[0]["searchSemanticEvents"];
  resolveChatbotModel?: Parameters<
    typeof createChatbotStreamResponse
  >[0]["resolveChatbotModel"];
  currentDate?: () => Date;
};

export function createConversationsRouter({
  streamText,
  searchSemanticEvents,
  resolveChatbotModel,
  currentDate = () => new Date(),
}: ConversationsRouteOptions = {}) {
  return new Hono<AppEnv>().post(
    "/:id/messages",
    validateConversationIdParam,
    async (c) => {
      const user = c.get("user");
      const prisma = getPrisma(c);
      const { id } = c.req.valid("param");
      const body = parseSendMessageBody(await readJsonBody(c), c);
      if (body instanceof Response) {
        return body;
      }

      const conversation = await getConversationForUserOrThrow(prisma, id, user.id);

      await createConversationMessage(prisma, {
        conversationId: id,
        role: "USER",
        content: body.content,
      });

      const pendingAction = parsePendingChatAction(conversation.pendingAction);
      if (pendingAction) {
        const decision = interpretPendingActionDecision(body.content);

        if (decision === "CONFIRM") {
          const execution = await executePendingChatAction(c, {
            prisma,
            userId: user.id,
            conversationId: id,
            pendingAction,
          });

          await createConversationMessage(prisma, {
            conversationId: id,
            role: "ASSISTANT",
            content: execution.text,
          });

          return createStaticSseTextResponse(execution.text);
        }

        if (decision === "CANCEL") {
          const text = await cancelPendingChatAction(prisma, id);
          await createConversationMessage(prisma, {
            conversationId: id,
            role: "ASSISTANT",
            content: text,
          });

          return createStaticSseTextResponse(text);
        }

        const text =
          "Please confirm or cancel the pending action before we continue.";
        await createConversationMessage(prisma, {
          conversationId: id,
          role: "ASSISTANT",
          content: text,
        });

        return createStaticSseTextResponse(text);
      }

      const messages = await listRecentConversationMessages(prisma, id);

      return createChatbotStreamResponse({
        messages,
        prisma,
        userId: user.id,
        conversationId: id,
        env: c.env as unknown as Record<string, string | undefined>,
        currentDate: currentDate(),
        streamText,
        searchSemanticEvents,
        resolveChatbotModel,
        onComplete: async (assistantText) => {
          if (!assistantText.trim()) {
            return;
          }

          await createConversationMessage(prisma, {
            conversationId: id,
            role: "ASSISTANT",
            content: assistantText,
          });
        },
      });
    },
  );
}

export const conversations = createConversationsRouter();
