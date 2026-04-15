import { generateText, Output } from "ai";
import { z } from "zod";
import { createAIModelRouter, type AIEnvironment, type ResolvedAITask } from "../lib/ai/router";

export type EventTaggingInput = {
  title: string;
  description: string;
};

export type EventTaggingOutput = {
  tags: string[];
  summary: string | null;
  category: string | null;
};

type AIRouterLike = Pick<
  ReturnType<typeof createAIModelRouter>,
  "resolveTask" | "getLanguageModel"
>;

type GenerateTextLike = typeof generateText;

const taggingOutputSchema = z.object({
  tags: z.array(z.string()).default([]),
  summary: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export const EVENT_TAGGING_SYSTEM_PROMPT = [
  "You generate structured discovery metadata for BuckAI Events events.",
  "Use only the provided event details.",
  "Return concise, student-facing tags, a category, and a short summary.",
  "Do not invent facts or add unsupported details.",
].join(" ");

function buildTaggingPrompt(input: EventTaggingInput) {
  return [
    "Generate event discovery metadata for this event.",
    `Title: ${input.title}`,
    `Description: ${input.description}`,
  ].join("\n");
}

function normalizeTag(value: string): string | null {
  const normalized = value.trim().replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!normalized || normalized.length > 50) {
    return null;
  }

  return normalized;
}

function normalizeSummary(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 500);
}

function normalizeCategory(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function normalizeOutput(output: z.infer<typeof taggingOutputSchema>): EventTaggingOutput {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const tag of output.tags) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(normalized);

    if (tags.length === 20) {
      break;
    }
  }

  return {
    tags,
    summary: normalizeSummary(output.summary),
    category: normalizeCategory(output.category),
  };
}

export async function generateEventTagging(
  input: EventTaggingInput,
  {
    router,
    env,
    generateText: generateTextImpl = generateText,
  }: {
    router?: AIRouterLike;
    env?: AIEnvironment;
    generateText?: GenerateTextLike;
  } = {},
): Promise<EventTaggingOutput> {
  const resolvedRouter = router ?? createAIModelRouter({ env });
  const resolvedTask: ResolvedAITask = resolvedRouter.resolveTask("tagging");

  const { output } = await generateTextImpl({
    model: resolvedRouter.getLanguageModel("tagging"),
    system: EVENT_TAGGING_SYSTEM_PROMPT,
    temperature: resolvedTask.task.temperature,
    maxOutputTokens: resolvedTask.task.maxOutputTokens,
    prompt: buildTaggingPrompt(input),
    output: Output.object({
      schema: taggingOutputSchema,
    }),
  });

  return normalizeOutput(output);
}
