import { Hono, type Context } from "hono";
import { paginated } from "../lib/pagination";
import { getPrisma } from "../lib/prisma";
import { generateConversationTitle } from "../services/conversation-titles";
import {
  CHATBOT_FAILURE_MESSAGE,
  buildFallbackReplySuggestions,
  parsePendingChatAction,
  cancelPendingChatAction,
  createChatbotStreamResponse,
  createStaticSseTextResponse,
  executePendingChatAction,
  interpretPendingActionDecision,
} from "../services/chatbot";
import {
  createConversation,
  createConversationMessage,
  deleteConversationForUser,
  getConversationForUserOrThrow,
  listConversationMessagesForUser,
  listRecentConversationMessages,
  listUserConversations,
} from "../services/conversations";
import {
  parseSendMessageBody,
  readJsonBody,
  resolvePaginationQuery,
  validateConversationIdParam,
  validatePaginationQuery,
} from "../lib/validators";
import type { AppEnv } from "../lib/types";
type ConversationsRouteOptions = {
  streamText?: Parameters<typeof createChatbotStreamResponse>[0]["streamText"];
  generateConversationTitle?: typeof generateConversationTitle;
  searchSemanticEvents?: Parameters<
    typeof createChatbotStreamResponse
  >[0]["searchSemanticEvents"];
  resolveChatbotModel?: Parameters<
    typeof createChatbotStreamResponse
  >[0]["resolveChatbotModel"];
  currentDate?: () => Date;
};

function readRequestHeader(c: Context<AppEnv>, name: string) {
  return c.req.raw.headers.get(name)?.trim() || undefined;
}

function resolveRequestLocale(c: Context<AppEnv>) {
  const explicitLocale = readRequestHeader(c, "x-user-locale");
  if (explicitLocale) {
    return explicitLocale;
  }

  const acceptLanguage = readRequestHeader(c, "accept-language");
  return acceptLanguage?.split(",")[0]?.trim() || undefined;
}

export function createConversationsRouter({
  streamText,
  generateConversationTitle: generateConversationTitleImpl = generateConversationTitle,
  searchSemanticEvents,
  resolveChatbotModel,
  currentDate = () => new Date(),
}: ConversationsRouteOptions = {}) {
  return new Hono<AppEnv>()
    .post("/", async (c) => {
      const user = c.get("user");
      const prisma = getPrisma(c);
      const conversation = await createConversation(prisma, user.id);

      return c.json(conversation, 201);
    })
    .get("/", validatePaginationQuery, async (c) => {
      const user = c.get("user");
      const prisma = getPrisma(c);
      const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));

      const result = await listUserConversations(prisma, {
        userId: user.id,
        limit,
        offset,
      });

      return c.json(
        paginated(result.data, {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        }),
      );
    })
    .delete("/:id", validateConversationIdParam, async (c) => {
      const user = c.get("user");
      const prisma = getPrisma(c);
      const { id } = c.req.valid("param");

      await deleteConversationForUser(prisma, {
        conversationId: id,
        userId: user.id,
      });

      return c.body(null, 204);
    })
    .get(
      "/:id/messages",
      validateConversationIdParam,
      validatePaginationQuery,
      async (c) => {
        const user = c.get("user");
        const prisma = getPrisma(c);
        const { id } = c.req.valid("param");
        const { limit, offset } = resolvePaginationQuery(c.req.valid("query"));

        const result = await listConversationMessagesForUser(prisma, {
          conversationId: id,
          userId: user.id,
          limit,
          offset,
        });

        return c.json(
          paginated(result.data, {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
          }),
        );
      },
    )
    .post("/:id/messages", validateConversationIdParam, async (c) => {
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
      const shouldGenerateTitle =
        conversation.title == null && messages.length === 1;

      try {
        return createChatbotStreamResponse({
          messages,
          prisma,
          userId: user.id,
          conversationId: id,
          env: c.env as unknown as Record<string, string | undefined>,
          currentDate: currentDate(),
          timezone: readRequestHeader(c, "x-user-timezone"),
          locale: resolveRequestLocale(c),
          streamText,
          searchSemanticEvents,
          resolveChatbotModel,
          onComplete: async ({ assistantText, parts }) => {
            if (!assistantText.trim() && !parts.length) {
              return;
            }

            const refreshedConversation = await prisma.conversation.findUnique({
              where: { id },
              select: { pendingAction: true },
            });
            const fallbackReplySuggestions = buildFallbackReplySuggestions({
              assistantText,
              lastUserMessage: body.content,
              parts,
              hasPendingAction: Boolean(
                parsePendingChatAction(refreshedConversation?.pendingAction),
              ),
            });
            const messageParts = fallbackReplySuggestions
              ? [...parts, fallbackReplySuggestions]
              : parts;

            await createConversationMessage(prisma, {
              conversationId: id,
              role: "ASSISTANT",
              content: assistantText,
              parts: messageParts,
            });

            if (!shouldGenerateTitle) {
              return;
            }

            await generateConversationTitleImpl({
              prisma,
              conversationId: id,
              firstMessageContent: body.content,
              env: c.env as unknown as Record<string, string | undefined>,
            });
          },
        });
      } catch (error) {
        console.error("Failed to create chatbot stream response", error);
        return createStaticSseTextResponse(CHATBOT_FAILURE_MESSAGE);
      }
    });
}

export const conversations = createConversationsRouter();
