import { Prisma, type PrismaClient } from "@prisma/client";
import { stepCountIs, streamText, tool } from "ai";
import type { Context } from "hono";
import { z } from "zod";
import { createAIModelRouter, type AIEnvironment } from "../lib/ai/router";
import { BadRequestError, NotFoundError } from "../lib/problem-details";
import type { AppEnv } from "../lib/types";
import { trackBackgroundTask } from "../lib/worker-runtime";
import {
  addItemToOwnedCollection,
  createOwnedCollection,
} from "./collections";
import { searchEventsSemantically } from "./event-embeddings";
import {
  COMPENSATION_TYPES,
  CREATOR_SELECT,
  createEvent,
  type CompensationType,
} from "./events";
import { scheduleEventPipelineFromContext } from "./event-pipeline";
import { applyToGig } from "./gigs";
import { getCurrentUserOrThrow } from "./users";

type MinimalModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StreamTextLike = (options: Record<string, unknown>) => {
  textStream: AsyncIterable<string>;
};

type SearchSemanticEventsLike = (
  prisma: PrismaClient,
  input: Parameters<typeof searchEventsSemantically>[1],
) => Promise<Array<Record<string, unknown>>>;

type ResolveChatbotModelLike = (env?: AIEnvironment) => {
  model: unknown;
  temperature?: number;
  maxOutputTokens?: number;
};

export const CHATBOT_SYSTEM_PROMPT = [
  "You are the Social OSU assistant for Ohio State University students.",
  "Only help with events, gigs, and campus activities that are on the Social OSU platform.",
  "Use the available tools whenever you need real data.",
  "Do not invent events, gigs, users, collections, or results.",
  "If a tool returns no matches, say that clearly and do not fabricate options.",
  "Politely decline off-topic requests and redirect the user back to events or gigs.",
  "Before any mutation such as applying, saving, or creating, ask for confirmation first.",
  "If the user cancels or denies a proposed action, acknowledge it and do not retry the same mutation automatically.",
  "Keep responses concise and student-facing.",
].join(" ");

export const CHATBOT_FAILURE_MESSAGE =
  "I'm having trouble connecting right now. Please try again in a moment.";

type PendingApplyToGigAction = {
  id: string;
  toolName: "applyToGig";
  summary: string;
  args: {
    gigId: string;
    message: string | null;
  };
};

type PendingSaveEventAction = {
  id: string;
  toolName: "saveEvent";
  summary: string;
  args: {
    eventId: string;
    collectionId: string | null;
  };
};

type PendingCreateEventAction = {
  id: string;
  toolName: "createEvent";
  summary: string;
  args: {
    title: string;
    description: string;
    type: "EVENT" | "GIG";
    location: {
      name: string;
      latitude: number | null;
      longitude: number | null;
    };
    startAt: string;
    endAt: string | null;
    compensation: {
      amount: number | null;
      currency: string;
      type: CompensationType | null;
    } | null;
    imageUrl: string | null;
  };
};

export type PendingChatAction =
  | PendingApplyToGigAction
  | PendingSaveEventAction
  | PendingCreateEventAction;

const searchEventsInputSchema = z.object({
  query: z.string().trim().optional(),
  category: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

const searchGigsInputSchema = z.object({
  query: z.string().trim().optional(),
  minCompensation: z.number().nonnegative().optional(),
  maxCompensation: z.number().nonnegative().optional(),
  compensationType: z.enum(COMPENSATION_TYPES).optional(),
  category: z.string().trim().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

const pendingChatActionSchema = z.discriminatedUnion("toolName", [
  z.object({
    id: z.string(),
    toolName: z.literal("applyToGig"),
    summary: z.string(),
    args: z.object({
      gigId: z.string(),
      message: z.string().nullable(),
    }),
  }),
  z.object({
    id: z.string(),
    toolName: z.literal("saveEvent"),
    summary: z.string(),
    args: z.object({
      eventId: z.string(),
      collectionId: z.string().nullable(),
    }),
  }),
  z.object({
    id: z.string(),
    toolName: z.literal("createEvent"),
    summary: z.string(),
    args: z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(["EVENT", "GIG"]),
      location: z.object({
        name: z.string(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
      }),
      startAt: z.string(),
      endAt: z.string().nullable(),
      compensation: z
        .object({
          amount: z.number().nullable(),
          currency: z.string(),
          type: z.enum(COMPENSATION_TYPES).nullable(),
        })
        .nullable(),
      imageUrl: z.string().nullable(),
    }),
  }),
]);

function resolveChatbotModelFromEnv(env?: AIEnvironment) {
  const router = createAIModelRouter({ env });
  const task = router.resolveTask("chatbot");

  return {
    model: router.getLanguageModel("chatbot"),
    temperature: task.task.temperature,
    maxOutputTokens: task.task.maxOutputTokens,
  };
}

function normalizeLimit(limit?: number, fallback = 5) {
  return Math.min(Math.max(limit ?? fallback, 1), 10);
}

function parseOptionalDate(value: string | undefined, field: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${field} must be a valid ISO date`);
  }

  return date;
}

function parseRequiredDate(value: string, field: string) {
  const parsed = parseOptionalDate(value, field);
  if (!parsed) {
    throw new BadRequestError(`${field} is required`);
  }

  return parsed;
}

function mapSearchResult(event: Record<string, unknown>) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    summary: event.summary ?? null,
    type: event.type,
    category: event.category ?? null,
    tags: Array.isArray(event.tags) ? event.tags : [],
    imageUrl: event.imageUrl ?? null,
    location: {
      name: event.locationName,
      latitude: event.locationLatitude ?? null,
      longitude: event.locationLongitude ?? null,
    },
    startAt:
      event.startAt instanceof Date
        ? event.startAt.toISOString()
        : event.startAt,
    endAt:
      event.endAt instanceof Date ? event.endAt.toISOString() : event.endAt ?? null,
    compensation:
      event.compensationAmount == null
        ? null
        : {
            amount: event.compensationAmount,
            currency: event.compensationCurrency ?? "USD",
            type: event.compensationType ?? null,
          },
    similarity:
      typeof event.similarity === "number" ? event.similarity : undefined,
  };
}

async function listStructuredEvents(
  prisma: PrismaClient,
  input: {
    now: Date;
    type: "EVENT" | "GIG";
    category?: string;
    startDate?: Date;
    endDate?: Date;
    minCompensation?: number;
    maxCompensation?: number;
    compensationType?: CompensationType;
    limit: number;
  },
) {
  const startAtFilter: Record<string, Date> = {
    gte: input.startDate ?? input.now,
  };

  if (input.endDate) {
    startAtFilter.lte = input.endDate;
  }

  const where: Record<string, unknown> = {
    type: input.type,
    status: { in: ["OPEN", "IN_PROGRESS"] },
    startAt: startAtFilter,
  };

  if (input.category) {
    where.category = input.category;
  }

  if (
    input.minCompensation !== undefined ||
    input.maxCompensation !== undefined
  ) {
    const compensationAmount: Record<string, number> = {};
    if (input.minCompensation !== undefined) {
      compensationAmount.gte = input.minCompensation;
    }
    if (input.maxCompensation !== undefined) {
      compensationAmount.lte = input.maxCompensation;
    }
    where.compensationAmount = compensationAmount;
  }

  if (input.compensationType) {
    where.compensationType = input.compensationType;
  }

  const [results, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { creator: { select: CREATOR_SELECT } },
      orderBy: { startAt: "asc" },
      take: input.limit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    total,
    results: results.map((result) => mapSearchResult(result as never)),
  };
}

async function assertNoPendingAction(
  prisma: PrismaClient,
  conversationId: string,
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      pendingAction: true,
    },
  });

  if (parsePendingChatAction(conversation?.pendingAction)) {
    throw new BadRequestError(
      "Please confirm or cancel the pending chatbot action before starting another one",
    );
  }
}

async function stagePendingChatAction(
  prisma: PrismaClient,
  input: {
    conversationId: string;
    action: PendingChatAction;
    currentDate: Date;
  },
) {
  await assertNoPendingAction(prisma, input.conversationId);

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: {
      pendingAction: input.action as Prisma.InputJsonValue,
      pendingActionCreatedAt: input.currentDate,
    },
  });
}

async function resolveDefaultCollectionId(
  prisma: PrismaClient,
  userId: string,
) {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 1,
  });

  const existing = collections[0];
  if (existing) {
    return existing.id;
  }

  const created = await createOwnedCollection(prisma, {
    ownerId: userId,
    data: {
      name: "Saved",
      visibility: "PRIVATE",
    },
  });

  return created.id;
}

async function buildApplyToGigSummary(
  prisma: PrismaClient,
  gigId: string,
) {
  const gig = await prisma.event.findUnique({
    where: { id: gigId },
    select: {
      id: true,
      title: true,
      type: true,
    },
  });

  if (!gig) {
    throw new NotFoundError("Gig not found");
  }

  if (gig.type !== "GIG") {
    throw new BadRequestError("Event is not a gig");
  }

  return `Apply to ${gig.title}`;
}

async function buildSaveEventSummary(
  prisma: PrismaClient,
  eventId: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
    },
  });

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  return `Save ${event.title}`;
}

function buildCreateEventSummary(input: {
  title: string;
  type: "EVENT" | "GIG";
}) {
  return `Create ${input.type === "GIG" ? "gig" : "event"} "${input.title}"`;
}

export function parsePendingChatAction(value: unknown): PendingChatAction | null {
  const parsed = pendingChatActionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function interpretPendingActionDecision(
  content: string,
): "CONFIRM" | "CANCEL" | null {
  const normalized = content.trim().toLowerCase();

  if (
    normalized === "confirm" ||
    normalized === "yes" ||
    normalized === "approve" ||
    normalized === "approved" ||
    normalized === "go ahead"
  ) {
    return "CONFIRM";
  }

  if (
    normalized === "cancel" ||
    normalized === "no" ||
    normalized === "deny" ||
    normalized === "denied"
  ) {
    return "CANCEL";
  }

  return null;
}

export function toModelMessages(
  messages: Array<{ role: string; content: string }>,
): MinimalModelMessage[] {
  const modelMessages: MinimalModelMessage[] = [];

  for (const message of messages) {
    switch (message.role) {
      case "USER":
        modelMessages.push({ role: "user", content: message.content });
        break;
      case "ASSISTANT":
        modelMessages.push({ role: "assistant", content: message.content });
        break;
      case "SYSTEM":
        modelMessages.push({ role: "system", content: message.content });
        break;
    }
  }

  return modelMessages;
}

export function createSseTextResponse(input: {
  textStream: AsyncIterable<string>;
  onComplete?: (fullText: string) => Promise<void>;
  fallbackText?: string;
}) {
  const encoder = new TextEncoder();

  function toSseChunk(value: string) {
    return value
      .split("\n")
      .map((line) => `data: ${line}\n`)
      .join("")
      .concat("\n");
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        let fullText = "";

        try {
          for await (const chunk of input.textStream) {
            fullText += chunk;
            controller.enqueue(encoder.encode(toSseChunk(chunk)));
          }

          if (input.onComplete) {
            await input.onComplete(fullText);
          }
        } catch (error) {
          if (!fullText && input.fallbackText?.trim()) {
            controller.enqueue(encoder.encode(toSseChunk(input.fallbackText)));
          }
          console.error("Failed to stream chatbot response", error);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "cache-control": "no-cache, no-transform",
        "content-type": "text/event-stream; charset=utf-8",
      },
    },
  );
}

export function createStaticSseTextResponse(text: string) {
  return createSseTextResponse({
    textStream: {
      async *[Symbol.asyncIterator]() {
        yield text;
      },
    },
  });
}

export function createChatbotTools(
  input: {
    prisma: PrismaClient;
    userId: string;
    conversationId: string;
    env?: AIEnvironment;
    currentDate: Date;
    searchSemanticEvents?: SearchSemanticEventsLike;
  },
) {
  const searchSemanticEvents =
    input.searchSemanticEvents ?? searchEventsSemantically;

  return {
    searchEvents: tool({
      description:
        "Search Social OSU events using semantic search when a query is provided, otherwise structured event filters.",
      inputSchema: searchEventsInputSchema,
      execute: async ({ query, category, startDate, endDate, limit }) => {
        const parsedStartDate = parseOptionalDate(startDate, "startDate");
        const parsedEndDate = parseOptionalDate(endDate, "endDate");
        const normalizedLimit = normalizeLimit(limit);

        if (query?.trim()) {
          const results = await searchSemanticEvents(input.prisma, {
            query: query.trim(),
            type: "EVENT",
            category,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            limit: normalizedLimit,
            env: input.env,
          });

          return {
            total: results.length,
            results: results.map((result) => mapSearchResult(result)),
          };
        }

        return listStructuredEvents(input.prisma, {
          now: input.currentDate,
          type: "EVENT",
          category,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          limit: normalizedLimit,
        });
      },
    }),
    searchGigs: tool({
      description:
        "Search Social OSU gigs using semantic search when a query is provided and structured gig filters otherwise.",
      inputSchema: searchGigsInputSchema,
      execute: async ({
        query,
        minCompensation,
        maxCompensation,
        compensationType,
        category,
        limit,
      }) => {
        const normalizedLimit = normalizeLimit(limit);

        if (query?.trim()) {
          const results = await searchSemanticEvents(input.prisma, {
            query: query.trim(),
            type: "GIG",
            category,
            minCompensation,
            maxCompensation,
            compensationType,
            limit: normalizedLimit,
            env: input.env,
          });

          return {
            total: results.length,
            results: results.map((result) => mapSearchResult(result)),
          };
        }

        return listStructuredEvents(input.prisma, {
          now: input.currentDate,
          type: "GIG",
          category,
          minCompensation,
          maxCompensation,
          compensationType,
          limit: normalizedLimit,
        });
      },
    }),
    getUserPreferences: tool({
      description:
        "Get the authenticated user's profile context and interests for personalized event and gig recommendations.",
      inputSchema: z.object({}),
      execute: async () => {
        const user = await getCurrentUserOrThrow(input.prisma, input.userId);

        return {
          displayName: user.displayName,
          major: user.major,
          gradYear: user.gradYear,
          interests: user.interests,
        };
      },
    }),
    applyToGig: tool({
      description:
        "Stage an application to a gig. This requires user confirmation before the application is submitted.",
      inputSchema: z.object({
        gigId: z.string().trim(),
        message: z.string().trim().optional(),
      }),
      execute: async ({ gigId, message }) => {
        const summary = await buildApplyToGigSummary(input.prisma, gigId);
        const action: PendingApplyToGigAction = {
          id: crypto.randomUUID(),
          toolName: "applyToGig",
          summary,
          args: {
            gigId,
            message: message?.trim() || null,
          },
        };

        await stagePendingChatAction(input.prisma, {
          conversationId: input.conversationId,
          action,
          currentDate: input.currentDate,
        });

        return {
          status: "confirmation-required" as const,
          toolName: action.toolName,
          summary: action.summary,
          args: action.args,
        };
      },
    }),
    saveEvent: tool({
      description:
        "Stage saving an event to a collection. This requires user confirmation before the save happens.",
      inputSchema: z.object({
        eventId: z.string().trim(),
        collectionId: z.string().trim().optional(),
      }),
      execute: async ({ eventId, collectionId }) => {
        const summary = await buildSaveEventSummary(input.prisma, eventId);
        const action: PendingSaveEventAction = {
          id: crypto.randomUUID(),
          toolName: "saveEvent",
          summary,
          args: {
            eventId,
            collectionId: collectionId?.trim() || null,
          },
        };

        await stagePendingChatAction(input.prisma, {
          conversationId: input.conversationId,
          action,
          currentDate: input.currentDate,
        });

        return {
          status: "confirmation-required" as const,
          toolName: action.toolName,
          summary: action.summary,
          args: action.args,
        };
      },
    }),
    createEvent: tool({
      description:
        "Stage creating a new event or gig. This requires user confirmation before the record is created.",
      inputSchema: z.object({
        title: z.string().trim(),
        description: z.string().trim(),
        type: z.enum(["EVENT", "GIG"]),
        location: z.object({
          name: z.string().trim(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        }),
        startAt: z.string().trim(),
        endAt: z.string().trim().optional(),
        compensation: z
          .object({
            amount: z.number().optional(),
            currency: z.string().trim().optional(),
            type: z.enum(COMPENSATION_TYPES).optional(),
          })
          .optional(),
        imageUrl: z.string().trim().optional(),
      }),
      execute: async ({
        title,
        description,
        type,
        location,
        startAt,
        endAt,
        compensation,
        imageUrl,
      }) => {
        parseRequiredDate(startAt, "startAt");
        if (endAt) {
          parseOptionalDate(endAt, "endAt");
        }

        const action: PendingCreateEventAction = {
          id: crypto.randomUUID(),
          toolName: "createEvent",
          summary: buildCreateEventSummary({ title, type }),
          args: {
            title,
            description,
            type,
            location: {
              name: location.name,
              latitude: location.latitude ?? null,
              longitude: location.longitude ?? null,
            },
            startAt,
            endAt: endAt ?? null,
            compensation: compensation
              ? {
                  amount: compensation.amount ?? null,
                  currency: compensation.currency ?? "USD",
                  type: compensation.type ?? null,
                }
              : null,
            imageUrl: imageUrl?.trim() || null,
          },
        };

        await stagePendingChatAction(input.prisma, {
          conversationId: input.conversationId,
          action,
          currentDate: input.currentDate,
        });

        return {
          status: "confirmation-required" as const,
          toolName: action.toolName,
          summary: action.summary,
          args: action.args,
        };
      },
    }),
  };
}

export function createChatbotStreamResponse(
  input: {
    messages: Array<{ role: string; content: string }>;
    prisma: PrismaClient;
    userId: string;
    conversationId: string;
    env?: AIEnvironment;
    currentDate: Date;
    streamText?: StreamTextLike;
    searchSemanticEvents?: SearchSemanticEventsLike;
    resolveChatbotModel?: ResolveChatbotModelLike;
    onComplete?: (assistantText: string) => Promise<void>;
  },
) {
  const streamTextImpl =
    input.streamText ?? (streamText as unknown as StreamTextLike);
  const resolveChatbotModel =
    input.resolveChatbotModel ??
    (input.streamText
      ? (() => ({
          model: undefined,
          temperature: undefined,
          maxOutputTokens: undefined,
        }))
      : resolveChatbotModelFromEnv);
  const resolvedModel = resolveChatbotModel(input.env);

  const result = streamTextImpl({
    model: resolvedModel.model,
    system: CHATBOT_SYSTEM_PROMPT,
    messages: toModelMessages(input.messages),
    tools: createChatbotTools({
      prisma: input.prisma,
      userId: input.userId,
      conversationId: input.conversationId,
      env: input.env,
      currentDate: input.currentDate,
      searchSemanticEvents: input.searchSemanticEvents,
    }),
    temperature: resolvedModel.temperature,
    maxOutputTokens: resolvedModel.maxOutputTokens,
    stopWhen: stepCountIs(5),
  });

  return createSseTextResponse({
    textStream: result.textStream,
    onComplete: input.onComplete,
    fallbackText: CHATBOT_FAILURE_MESSAGE,
  });
}

export async function executePendingChatAction(
  c: Context<AppEnv>,
  input: {
    prisma: PrismaClient;
    userId: string;
    conversationId: string;
    pendingAction: PendingChatAction;
  },
) {
  switch (input.pendingAction.toolName) {
    case "applyToGig": {
      const { application, interaction } = await applyToGig(input.prisma, {
        gigId: input.pendingAction.args.gigId,
        applicantId: input.userId,
        application: {
          message: input.pendingAction.args.message,
        },
      });

      trackBackgroundTask(
        c,
        input.prisma.interaction.create({
          data: interaction,
        }),
        "record APPLY interaction",
      );

      await input.prisma.conversation.update({
        where: { id: input.conversationId },
        data: {
          pendingAction: Prisma.DbNull,
          pendingActionCreatedAt: null,
        },
      });

      return {
        text: "Done! I've submitted your application.",
        result: application,
      };
    }
    case "saveEvent": {
      const collectionId =
        input.pendingAction.args.collectionId ??
        (await resolveDefaultCollectionId(input.prisma, input.userId));

      const collection = await input.prisma.collection.findUnique({
        where: { id: collectionId },
        select: { id: true, name: true },
      });

      if (!collection) {
        throw new NotFoundError("Collection not found");
      }

      const { item, interaction } = await addItemToOwnedCollection(input.prisma, {
        collectionId,
        ownerId: input.userId,
        eventId: input.pendingAction.args.eventId,
      });

      trackBackgroundTask(
        c,
        input.prisma.interaction.create({
          data: interaction,
        }),
        "record SAVE interaction",
      );

      await input.prisma.conversation.update({
        where: { id: input.conversationId },
        data: {
          pendingAction: Prisma.DbNull,
          pendingActionCreatedAt: null,
        },
      });

      return {
        text: `Done! I saved that event to ${collection.name}.`,
        result: item,
      };
    }
    case "createEvent": {
      const created = await createEvent(input.prisma, input.userId, {
        title: input.pendingAction.args.title,
        description: input.pendingAction.args.description,
        type: input.pendingAction.args.type,
        location: input.pendingAction.args.location,
        startAt: parseRequiredDate(input.pendingAction.args.startAt, "startAt"),
        endAt: input.pendingAction.args.endAt
          ? parseOptionalDate(input.pendingAction.args.endAt, "endAt") ?? null
          : null,
        compensation: input.pendingAction.args.compensation,
        imageUrl: input.pendingAction.args.imageUrl,
      });

      try {
        await scheduleEventPipelineFromContext(c, {
          eventId: created.id,
          trigger: "EVENT_CREATE",
          stages: ["TAGGING", "EMBEDDING"],
          requestedByUserId: input.userId,
        });
      } catch (error) {
        console.error(
          `Failed to schedule event pipeline for chatbot-created event ${created.id}`,
          error,
        );
      }

      await input.prisma.conversation.update({
        where: { id: input.conversationId },
        data: {
          pendingAction: Prisma.DbNull,
          pendingActionCreatedAt: null,
        },
      });

      return {
        text:
          input.pendingAction.args.type === "GIG"
            ? `Done! I created the gig "${created.title}".`
            : `Done! I created the event "${created.title}".`,
        result: created,
      };
    }
  }
}

export async function cancelPendingChatAction(
  prisma: PrismaClient,
  conversationId: string,
) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      pendingAction: Prisma.DbNull,
      pendingActionCreatedAt: null,
    },
  });

  return "No problem, I won't apply.";
}
