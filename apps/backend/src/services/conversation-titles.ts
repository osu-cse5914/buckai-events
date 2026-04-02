import type { PrismaClient } from "@prisma/client";
import { generateText } from "ai";
import { createAIModelRouter, type AIEnvironment } from "../lib/ai/router";

type GenerateTextLike = (options: {
  model: unknown;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}) => Promise<{
  text: string;
}>;

type ResolveTitleModelLike = (env?: AIEnvironment) => {
  model: unknown;
  temperature?: number;
  maxOutputTokens?: number;
};

const CONVERSATION_TITLE_PROMPT = [
  "Generate a concise title for a Social OSU conversation.",
  "Use no more than 5 words.",
  "Return only the title text with no quotes or punctuation decoration.",
].join(" ");

function resolveTitleModelFromEnv(env?: AIEnvironment) {
  const router = createAIModelRouter({ env });
  const task = router.resolveTask("title-generation");

  return {
    model: router.getLanguageModel("title-generation"),
    temperature: task.task.temperature,
    maxOutputTokens: task.task.maxOutputTokens,
  };
}

function normalizeConversationTitle(text: string) {
  const normalized = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'\s]+|["'\s]+$/g, "");

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 200);
}

export async function generateConversationTitle(input: {
  prisma: PrismaClient;
  conversationId: string;
  firstMessageContent: string;
  env?: AIEnvironment;
  generateText?: GenerateTextLike;
  resolveTitleModel?: ResolveTitleModelLike;
}) {
  const generateTextImpl =
    input.generateText ?? (generateText as unknown as GenerateTextLike);
  const resolveTitleModel =
    input.resolveTitleModel ?? resolveTitleModelFromEnv;

  try {
    const resolvedModel = resolveTitleModel(input.env);
    const result = await generateTextImpl({
      model: resolvedModel.model,
      prompt: `${CONVERSATION_TITLE_PROMPT}\n\nMessage: ${input.firstMessageContent}`,
      temperature: resolvedModel.temperature,
      maxOutputTokens: resolvedModel.maxOutputTokens,
    });
    const title = normalizeConversationTitle(result.text);

    if (!title) {
      return;
    }

    await input.prisma.conversation.update({
      where: { id: input.conversationId },
      data: { title },
    });
  } catch (error) {
    console.error(
      `Failed to generate conversation title for ${input.conversationId}`,
      error,
    );
  }
}
