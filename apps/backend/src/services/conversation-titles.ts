import type { PrismaClient } from "@prisma/client";
import { generateText } from "ai";
import { createAIModelRouter, type AIEnvironment } from "../lib/ai/router";

type GenerateTextLike = (options: {
  model: unknown;
  system?: string;
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
  "Generate a concise title for a BuckAI Events conversation.",
  "Use no more than 5 words.",
  "Return only the title text with no quotes or punctuation decoration.",
].join(" ");

const TITLE_PROMPT_LEAK_PATTERNS = [
  /\bsocial osu conversation\b/i,
  /\bno more than\b/i,
  /\breturn only\b/i,
  /\bquotes?\b/i,
  /\bpunctuation\b/i,
  /\buser wants\b/i,
  /\btitle should\b/i,
  /\bmessage\b/i,
];

const TITLE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "about",
  "any",
  "are",
  "can",
  "could",
  "do",
  "find",
  "for",
  "happening",
  "help",
  "i",
  "is",
  "me",
  "please",
  "show",
  "tell",
  "the",
  "to",
  "want",
  "what",
  "whats",
  "which",
  "you",
]);

function resolveTitleModelFromEnv(env?: AIEnvironment) {
  const router = createAIModelRouter({ env });
  const task = router.resolveTask("title-generation");

  return {
    model: router.getLanguageModel("title-generation"),
    temperature: task.task.temperature,
    maxOutputTokens: task.task.maxOutputTokens,
  };
}

function extractTitleWords(text: string) {
  return text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? [];
}

function formatConversationTitle(words: string[]) {
  const normalized = words.slice(0, 5).join(" ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeConversationTitle(text: string) {
  const normalized = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/[.!?;:,]+$/g, "");

  if (!normalized) {
    return null;
  }

  return formatConversationTitle(extractTitleWords(normalized));
}

function looksLikePromptLeak(text: string) {
  return TITLE_PROMPT_LEAK_PATTERNS.some((pattern) => pattern.test(text));
}

function deriveConversationTitleFromMessage(message: string) {
  const words = extractTitleWords(message);
  const filtered = words.filter(
    (word) => !TITLE_STOPWORDS.has(word.toLowerCase()),
  );

  return formatConversationTitle(filtered.length ? filtered : words);
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
      system: CONVERSATION_TITLE_PROMPT,
      prompt: input.firstMessageContent,
      temperature: resolvedModel.temperature,
      maxOutputTokens: resolvedModel.maxOutputTokens,
    });
    const normalizedTitle = normalizeConversationTitle(result.text);
    const title =
      normalizedTitle && !looksLikePromptLeak(result.text)
        ? normalizedTitle
        : deriveConversationTitleFromMessage(input.firstMessageContent);

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
