import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { Prisma } from "@prisma/client";

vi.mock("../lib/prisma");

import { getPrismaClient, getPrisma } from "../lib/prisma";
import { registerApiErrorHandlers } from "../app";
import {
  CHATBOT_SYSTEM_PROMPT,
  createSseTextResponse,
} from "../services/chatbot";
import { createConversationsRouter } from "../routes/conversations";
import {
  buildAuthUser,
  buildConversation,
  buildMessage,
} from "./factories";
import { createMockPrisma } from "./helpers/prisma";

const USER_A = buildAuthUser({
  id: "user_a",
  clerkId: "clerk_a",
  email: "usera@osu.edu",
});

const NOW = new Date("2026-04-01T12:00:00.000Z");

function createConversation(overrides: Record<string, unknown> = {}) {
  return buildConversation({
    userId: USER_A.id,
    ...overrides,
  });
}

function createMessage(overrides: Record<string, unknown> = {}) {
  return buildMessage(overrides);
}

function decodeSseText(payload: string) {
  return payload
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length))
    .join("");
}

type StreamTextToolStub = {
  execute: (
    input: Record<string, unknown>,
    context: unknown,
  ) => Promise<unknown>;
};

type StreamTextStubOptions = Record<string, unknown> & {
  system?: string;
  messages?: Array<Record<string, unknown>>;
  tools: Record<string, StreamTextToolStub> & {
    searchEvents: StreamTextToolStub;
    searchGigs: StreamTextToolStub;
    suggestReplies: StreamTextToolStub;
    applyToGig: StreamTextToolStub;
  };
};

function createStreamTextStub(
  run: (options: StreamTextStubOptions) => Promise<string[]> | string[],
) {
  return vi.fn((options: Record<string, unknown>) => {
    const chunksPromise = Promise.resolve(run(options as StreamTextStubOptions));

    return {
      textStream: {
        async *[Symbol.asyncIterator]() {
          for (const chunk of await chunksPromise) {
            yield chunk;
          }
        },
      },
    };
  });
}

function createStreamTextErrorStub(error: Error) {
  return vi.fn(() => ({
    textStream: {
      async *[Symbol.asyncIterator]() {
        yield* [];
        throw error;
      },
    },
  }));
}

function createTestApp({
  streamText,
  searchSemanticEvents,
  generateConversationTitle = vi.fn().mockResolvedValue(undefined),
  currentDate = () => NOW,
}: {
  streamText?: ReturnType<typeof createStreamTextStub>;
  generateConversationTitle?: (input: {
    prisma: unknown;
    conversationId: string;
    firstMessageContent: string;
    env?: Record<string, string | undefined>;
  }) => Promise<void>;
  searchSemanticEvents?: (
    prisma: unknown,
    input: Record<string, unknown>,
  ) => Promise<Array<Record<string, unknown>>>;
  currentDate?: () => Date;
} = {}) {
  const app = new Hono();
  registerApiErrorHandlers(app);
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("user", USER_A);
    await next();
  });
  app.route(
    "/conversations",
    createConversationsRouter({
      streamText,
      searchSemanticEvents,
      generateConversationTitle,
      currentDate,
    }),
  );
  return app;
}

function postMessage(app: Hono, content: string) {
  return app.request("/conversations/conv_1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

describe("[phase:5] [regression:always] Chatbot tools and prompt", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation() as never,
    );
    vi.mocked(mockPrisma.conversation.update).mockResolvedValue(
      createConversation() as never,
    );
  });

  it("keeps the chatbot system prompt scoped to Social OSU event workflows", () => {
    expect(CHATBOT_SYSTEM_PROMPT).toContain("Ohio State University");
    expect(CHATBOT_SYSTEM_PROMPT).toContain("events, gigs, and campus activities");
    expect(CHATBOT_SYSTEM_PROMPT).toContain("decline");
    expect(CHATBOT_SYSTEM_PROMPT).toContain("confirm");
  });

  it("TC-CHAT-006: declines off-topic prompts without invoking event tools", async () => {
    const userMessage = createMessage({
      id: "msg_user_6",
      role: "USER",
      content: "What's the weather like tomorrow?",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_6",
      role: "ASSISTANT",
      content: "I can help with events and gigs on Social OSU, but I can't help with the weather.",
    });
    const streamText = createStreamTextStub(async ({ tools }) => {
      expect(tools.searchEvents.execute).toBeTypeOf("function");
      expect(tools.searchGigs.execute).toBeTypeOf("function");

      return [
        "I can help with events and gigs on Social OSU, but I can't help with the weather.",
      ];
    });

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(createTestApp({ streamText }), userMessage.content);

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I can help with events and gigs on Social OSU, but I can't help with the weather.",
    );
    expect(mockPrisma.event.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.application.create).not.toHaveBeenCalled();
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
          content:
            "I can help with events and gigs on Social OSU, but I can't help with the weather.",
        }),
      }),
    );
  });

  it("TC-CHAT-001: uses the searchEvents tool for grounded event search", async () => {
    const userMessage = createMessage({
      id: "msg_user_1",
      role: "USER",
      content: "What music events are happening this weekend?",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_1",
      role: "ASSISTANT",
      content: "I found a few music events this weekend.",
    });
    const event = {
      id: "evt_music_1",
      title: "Battle of the Bands",
      description: "Live student music showcase",
      summary: null,
      type: "EVENT",
      source: "USER",
      externalId: null,
      category: "music",
      tags: ["music"],
      imageUrl: null,
      ticketUrl: null,
      externalUrl: null,
      locationName: "Ohio Union",
      locationLatitude: null,
      locationLongitude: null,
      startAt: new Date("2026-04-04T18:00:00.000Z"),
      endAt: null,
      compensationAmount: null,
      compensationCurrency: "USD",
      compensationType: null,
      status: "OPEN",
      creatorId: "user_b",
      createdAt: new Date("2026-03-30T12:00:00.000Z"),
      updatedAt: new Date("2026-03-30T12:00:00.000Z"),
      creator: { id: "user_b", displayName: "Brutus", email: "brutus@osu.edu" },
    };
    const streamText = createStreamTextStub(async ({ system, tools, messages }) => {
      expect(system).toContain("Ohio State University");
      expect(messages).toEqual([
        { role: "user", content: userMessage.content },
      ]);

      const result = await tools.searchEvents.execute(
        {
          category: "music",
          startDate: "2026-04-04T00:00:00.000Z",
          endDate: "2026-04-05T23:59:59.999Z",
          limit: 5,
        },
        {} as never,
      );

      expect(result).toMatchObject({
        results: [
          {
            id: "evt_music_1",
            title: "Battle of the Bands",
          },
        ],
      });

      return ["I found a few music events this weekend."];
    });

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([event] as never);
    vi.mocked(mockPrisma.event.count).mockResolvedValue(1 as never);

    const res = await postMessage(createTestApp({ streamText }), userMessage.content);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(decodeSseText(await res.text())).toBe(
      "I found a few music events this weekend.",
    );
    expect(mockPrisma.event.findMany).toHaveBeenCalled();
    expect(mockPrisma.event.count).toHaveBeenCalled();
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: "conv_1",
          role: "ASSISTANT",
          content: "I found a few music events this weekend.",
          parts: expect.arrayContaining([
            expect.objectContaining({
              type: "search-results",
              toolName: "searchEvents",
              total: 1,
              items: [
                expect.objectContaining({
                  id: "evt_music_1",
                  title: "Battle of the Bands",
                  type: "EVENT",
                  category: "music",
                  location: expect.objectContaining({
                    name: "Ohio Union",
                  }),
                }),
              ],
            }),
            expect.objectContaining({
              type: "reply-suggestions",
              toolName: "suggestReplies",
            }),
          ]),
        }),
      }),
    );
  });

  it("TC-CONV-003: first message streams a response and triggers conversation title generation", async () => {
    const userMessage = createMessage({
      id: "msg_user_conv_3",
      role: "USER",
      content: "What free events are happening this weekend?",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_conv_3",
      role: "ASSISTANT",
      content: "I found a few free events this weekend.",
    });
    const generateConversationTitle = vi.fn().mockResolvedValue(undefined);
    const streamText = createStreamTextStub(async () => [
      "I found a few free events this weekend.",
    ]);

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(
      createTestApp({
        streamText,
        generateConversationTitle,
      }),
      userMessage.content,
    );

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I found a few free events this weekend.",
    );
    expect(generateConversationTitle).toHaveBeenCalledWith({
      prisma: mockPrisma,
      conversationId: "conv_1",
      firstMessageContent: userMessage.content,
      env: undefined,
    });
  });

  it("TC-CHAT-002: uses the searchGigs tool with semantic search and compensation filters", async () => {
    const userMessage = createMessage({
      id: "msg_user_2",
      role: "USER",
      content: "Find me a tutoring gig that pays at least $20/hr",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_2",
      role: "ASSISTANT",
      content: "I found a tutoring gig that matches that pay range.",
    });
    const searchSemanticEvents = vi.fn().mockResolvedValue([
      {
        id: "gig_1",
        title: "Physics Tutor",
        description: "One-on-one tutoring",
        type: "GIG",
        compensationAmount: 25,
        compensationCurrency: "USD",
        compensationType: "HOURLY",
        status: "OPEN",
        startAt: new Date("2026-04-03T17:00:00.000Z"),
        similarity: 0.96,
      },
    ]);
    const streamText = createStreamTextStub(async ({ tools }) => {
      const result = await tools.searchGigs.execute(
        {
          query: "tutoring",
          minCompensation: 20,
          compensationType: "HOURLY",
          limit: 5,
        },
        {} as never,
      );

      expect(result).toMatchObject({
        results: [
          {
            id: "gig_1",
            title: "Physics Tutor",
          },
        ],
      });

      return ["I found a tutoring gig that matches that pay range."];
    });

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(createTestApp({
      streamText,
      searchSemanticEvents,
    }), userMessage.content);

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I found a tutoring gig that matches that pay range.",
    );
    expect(searchSemanticEvents).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        query: "tutoring",
        type: "GIG",
        minCompensation: 20,
        compensationType: "HOURLY",
        limit: 5,
      }),
    );
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: "conv_1",
          role: "ASSISTANT",
          content: "I found a tutoring gig that matches that pay range.",
          parts: expect.arrayContaining([
            expect.objectContaining({
              type: "search-results",
              toolName: "searchGigs",
              total: 1,
              items: [
                expect.objectContaining({
                  id: "gig_1",
                  title: "Physics Tutor",
                  type: "GIG",
                  compensation: expect.objectContaining({
                    amount: 25,
                    currency: "USD",
                    type: "HOURLY",
                  }),
                }),
              ],
            }),
            expect.objectContaining({
              type: "reply-suggestions",
              toolName: "suggestReplies",
            }),
          ]),
        }),
      }),
    );
  });

  it("TC-CHAT-003: mutation tools require confirmation before applying", async () => {
    const userMessage = createMessage({
      id: "msg_user_3",
      role: "USER",
      content: "Apply me to that tutoring gig",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_3",
      role: "ASSISTANT",
      content: "I found the gig. Would you like me to apply for you?",
    });
    const gig = {
      id: "gig_apply_1",
      title: "Calculus Tutor",
      type: "GIG",
      status: "OPEN",
      creatorId: "user_b",
      compensationAmount: 25,
      compensationCurrency: "USD",
      compensationType: "HOURLY",
    };
    const streamText = createStreamTextStub(async ({ tools }) => {
      const result = await tools.applyToGig.execute(
        {
          gigId: "gig_apply_1",
          message: "I have tutoring experience.",
        },
        {} as never,
      );

      expect(result).toMatchObject({
        status: "confirmation-required",
        toolName: "applyToGig",
      });

      return ["I found the gig. Would you like me to apply for you?"];
    });

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(gig as never);

    const res = await postMessage(createTestApp({ streamText }), userMessage.content);

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I found the gig. Would you like me to apply for you?",
    );
    expect(mockPrisma.application.create).not.toHaveBeenCalled();
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv_1" },
        data: expect.objectContaining({
          pendingAction: expect.objectContaining({
            toolName: "applyToGig",
            args: expect.objectContaining({
              gigId: "gig_apply_1",
            }),
          }),
        }),
      }),
    );
  });

  it("TC-CHAT-004: confirming a pending mutation executes it and responds with success", async () => {
    const conversation = createConversation({
      pendingAction: {
        id: "pending_apply_1",
        toolName: "applyToGig",
        summary: "Apply to Calculus Tutor",
        args: {
          gigId: "gig_apply_1",
          message: "I have tutoring experience.",
        },
      },
      pendingActionCreatedAt: new Date("2026-04-01T11:59:00.000Z"),
    });
    const userMessage = createMessage({
      id: "msg_user_4",
      role: "USER",
      content: "confirm",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_4",
      role: "ASSISTANT",
      content: "Done! I've submitted your application.",
    });
    const gig = {
      id: "gig_apply_1",
      type: "GIG",
      status: "OPEN",
      creatorId: "user_b",
    };
    const application = {
      id: "app_1",
      gigId: "gig_apply_1",
      applicantId: USER_A.id,
      message: "I have tutoring experience.",
      status: "PENDING",
    };

    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      conversation as never,
    );
    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(gig as never);
    vi.mocked(mockPrisma.application.findUnique).mockResolvedValue(null as never);
    vi.mocked(mockPrisma.application.create).mockResolvedValue(application as never);
    vi.mocked(mockPrisma.interaction.create).mockResolvedValue({} as never);

    const res = await postMessage(createTestApp(), "confirm");

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "Done! I've submitted your application.",
    );
    expect(mockPrisma.application.create).toHaveBeenCalled();
    expect(mockPrisma.interaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_A.id,
        eventId: "gig_apply_1",
        action: "APPLY",
      },
    });
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv_1" },
        data: expect.objectContaining({
          pendingAction: Prisma.DbNull,
          pendingActionCreatedAt: null,
        }),
      }),
    );
  });

  it("TC-CHAT-005: canceling a pending mutation skips execution and acknowledges the cancellation", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation({
        pendingAction: {
          id: "pending_apply_1",
          toolName: "applyToGig",
          summary: "Apply to Calculus Tutor",
          args: {
            gigId: "gig_apply_1",
            message: "I have tutoring experience.",
          },
        },
      }) as never,
    );
    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_user_5",
          role: "USER",
          content: "cancel",
        }) as never,
      )
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_assistant_5",
          role: "ASSISTANT",
          content: "No problem, I won't apply.",
        }) as never,
      );

    const res = await postMessage(createTestApp(), "cancel");

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe("No problem, I won't apply.");
    expect(mockPrisma.application.create).not.toHaveBeenCalled();
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv_1" },
        data: expect.objectContaining({
          pendingAction: Prisma.DbNull,
          pendingActionCreatedAt: null,
        }),
      }),
    );
  });

  it("TC-CONV-006: only the last 20 messages are included in the chatbot context window", async () => {
    const recentMessages = Array.from({ length: 20 }, (_, index) =>
      createMessage({
        id: `msg_recent_${30 - index}`,
        role: (30 - index) % 2 === 0 ? "ASSISTANT" : "USER",
        content: `message ${30 - index}`,
        createdAt: new Date(`2026-04-01T12:${String(index).padStart(2, "0")}:00.000Z`),
      }),
    );
    const streamText = createStreamTextStub(async ({ messages }) => {
      expect(messages).toHaveLength(20);
      expect(messages?.[0]).toEqual({
        role: "user",
        content: "message 11",
      });
      expect(messages?.[19]).toEqual({
        role: "assistant",
        content: "message 30",
      });

      return ["Using the last 20 messages only."];
    });

    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation({ title: "Existing title" }) as never,
    );
    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_user_context",
          role: "USER",
          content: "continue",
        }) as never,
      )
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_assistant_context",
          role: "ASSISTANT",
          content: "Using the last 20 messages only.",
        }) as never,
      );
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue(
      recentMessages as never,
    );

    const res = await postMessage(createTestApp({ streamText }), "continue");

    expect(res.status).toBe(200);
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: "conv_1" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("TC-CONV-007: title generation failure does not block the chatbot response", async () => {
    const userMessage = createMessage({
      id: "msg_user_conv_7",
      role: "USER",
      content: "Show me music events this weekend",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_conv_7",
      role: "ASSISTANT",
      content: "Here are a few music events this weekend.",
    });
    const generateConversationTitle = vi
      .fn()
      .mockRejectedValue(new Error("AI unavailable"));
    const streamText = createStreamTextStub(async () => [
      "Here are a few music events this weekend.",
    ]);

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(
      createTestApp({
        streamText,
        generateConversationTitle,
      }),
      userMessage.content,
    );

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "Here are a few music events this weekend.",
    );
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
        }),
      }),
    );
  });

  it("TC-CONV-008: title generation does not rerun for conversations that already have titles", async () => {
    const generateConversationTitle = vi.fn().mockResolvedValue(undefined);
    const streamText = createStreamTextStub(async () => ["Let's look for gigs."]);

    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation({ title: "Free weekend events" }) as never,
    );
    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_user_conv_8",
          role: "USER",
          content: "What tutoring gigs are available?",
        }) as never,
      )
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_assistant_conv_8",
          role: "ASSISTANT",
          content: "Let's look for gigs.",
        }) as never,
      );
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue(
      [
        createMessage({
          id: "msg_prior_conv_8",
          role: "USER",
          content: "What free events are happening this weekend?",
        }),
        createMessage({
          id: "msg_user_conv_8",
          role: "USER",
          content: "What tutoring gigs are available?",
          createdAt: new Date("2026-04-01T12:01:00.000Z"),
        }),
      ] as never,
    );

    const res = await postMessage(
      createTestApp({
        streamText,
        generateConversationTitle,
      }),
      "What tutoring gigs are available?",
    );

    expect(res.status).toBe(200);
    expect(generateConversationTitle).not.toHaveBeenCalled();
  });

  it("TC-CHAT-007: grounded event searches report no matches without fabricated results", async () => {
    const userMessage = createMessage({
      id: "msg_user_7",
      role: "USER",
      content: "Are there any free events tonight?",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_7",
      role: "ASSISTANT",
      content: "I couldn't find any free events tonight.",
    });
    const searchSemanticEvents = vi.fn().mockResolvedValue([]);
    const streamText = createStreamTextStub(async ({ tools }) => {
      const result = await tools.searchEvents.execute(
        {
          query: "free events tonight",
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-04-01T23:59:59.999Z",
          limit: 5,
        },
        {} as never,
      );

      expect(result).toMatchObject({
        total: 0,
        results: [],
      });

      return ["I couldn't find any free events tonight."];
    });

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(
      createTestApp({
        streamText,
        searchSemanticEvents,
      }),
      userMessage.content,
    );

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I couldn't find any free events tonight.",
    );
    expect(searchSemanticEvents).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        query: "free events tonight",
        type: "EVENT",
        limit: 5,
      }),
    );
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
          content: "I couldn't find any free events tonight.",
          parts: expect.arrayContaining([
            expect.objectContaining({
              type: "search-results",
              toolName: "searchEvents",
              total: 0,
              items: [],
            }),
            expect.objectContaining({
              type: "reply-suggestions",
              toolName: "suggestReplies",
            }),
          ]),
        }),
      }),
    );
  });

  it("TC-CHAT-010: tool calls can return empty results without fabricated events", async () => {
    const userMessage = createMessage({
      id: "msg_user_10",
      role: "USER",
      content: "What coding events are happening next Tuesday?",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_10",
      role: "ASSISTANT",
      content: "I couldn't find any matching events for next Tuesday.",
    });
    const streamText = createStreamTextStub(async ({ tools }) => {
      const result = await tools.searchEvents.execute(
        {
          category: "tech",
          startDate: "2026-04-07T00:00:00.000Z",
          endDate: "2026-04-07T23:59:59.999Z",
          limit: 5,
        },
        {} as never,
      );

      expect(result).toMatchObject({ results: [] });
      return ["I couldn't find any matching events for next Tuesday."];
    });

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);
    vi.mocked(mockPrisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(mockPrisma.event.count).mockResolvedValue(0 as never);

    const res = await postMessage(createTestApp({ streamText }), userMessage.content);

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I couldn't find any matching events for next Tuesday.",
    );
  });

  it("TC-CHAT-008: chatbot responses stream SSE chunks incrementally", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation({ title: "Existing title" }) as never,
    );
    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_user_stream",
          role: "USER",
          content: "hello",
        }) as never,
      )
      .mockResolvedValueOnce(
        createMessage({
          id: "msg_assistant_stream",
          role: "ASSISTANT",
          content: "Hello there",
        }) as never,
      );
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue(
      [
        createMessage({
          id: "msg_user_stream",
          role: "USER",
          content: "hello",
        }),
      ] as never,
    );

    const res = await postMessage(
      createTestApp({
        streamText: createStreamTextStub(async () => ["Hello", " there"]),
      }),
      "hello",
    );

    expect(res.status).toBe(200);
    const payload = await res.text();
    expect(payload).toContain("data: Hello");
    expect(payload).toContain("data:  there");
    expect(decodeSseText(payload)).toBe("Hello there");
  });

  it("TC-CHAT-009: AI provider failures return the fallback message without storing an assistant reply", async () => {
    const userMessage = createMessage({
      id: "msg_user_failure",
      role: "USER",
      content: "What events are happening tonight?",
    });

    vi.mocked(mockPrisma.message.create).mockResolvedValueOnce(userMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(
      createTestApp({
        streamText: createStreamTextErrorStub(new Error("Gemini unavailable")),
      }),
      userMessage.content,
    );

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I'm having trouble connecting right now. Please try again in a moment.",
    );
    expect(mockPrisma.message.create).toHaveBeenCalledTimes(1);
  });
});

describe("[phase:6] [regression:always] Chatbot SSE lifecycle", () => {
  it("continues consuming the model stream after the SSE client disconnects", async () => {
    let releaseSecondChunk!: () => void;
    const secondChunkReady = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });
    let completeResolve!: () => void;
    const completed = new Promise<void>((resolve) => {
      completeResolve = resolve;
    });
    const onComplete = vi.fn(async (fullText: string) => {
      expect(fullText).toBe("firstsecond");
      completeResolve();
    });

    const response = createSseTextResponse({
      textStream: {
        async *[Symbol.asyncIterator]() {
          yield "first";
          await secondChunkReady;
          yield "second";
        },
      },
      onComplete,
    });

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const firstChunk = await reader!.read();
    expect(new TextDecoder().decode(firstChunk.value)).toContain("data: first");

    await reader!.cancel();
    releaseSecondChunk();
    await completed;

    expect(onComplete).toHaveBeenCalledWith("firstsecond");
  });
});

describe("[phase:6] [regression:always] Chatbot reply suggestions", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation() as never,
    );
    vi.mocked(mockPrisma.conversation.update).mockResolvedValue(
      createConversation() as never,
    );
  });

  it("TC-CHAT-013: records suggested replies as assistant message parts", async () => {
    const userMessage = createMessage({
      id: "msg_user_13",
      role: "USER",
      content: "Give me a few next steps for finding a music event.",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_13",
      role: "ASSISTANT",
      content: "Here are a few ways we can narrow it down.",
    });
    const streamText = createStreamTextStub(async ({ tools }) => {
      const result = await tools.suggestReplies.execute(
        {
          suggestions: [
            "Show me music events tonight",
            "Only free options",
            "What about live performances this weekend?",
          ],
        },
        {} as never,
      );

      expect(result).toEqual({
        suggestions: [
          "Show me music events tonight",
          "Only free options",
          "What about live performances this weekend?",
        ],
      });

      return ["Here are a few ways we can narrow it down."];
    });

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(createTestApp({ streamText }), userMessage.content);

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "Here are a few ways we can narrow it down.",
    );
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
          content: "Here are a few ways we can narrow it down.",
          parts: [
            {
              type: "reply-suggestions",
              toolName: "suggestReplies",
              suggestions: [
                "Show me music events tonight",
                "Only free options",
                "What about live performances this weekend?",
              ],
            },
          ],
        }),
      }),
    );
  });

  it("TC-CHAT-015: adds fallback suggested replies when the model does not call suggestReplies", async () => {
    const userMessage = createMessage({
      id: "msg_user_15",
      role: "USER",
      content: "Show me fitness events on campus",
    });
    const assistantMessage = createMessage({
      id: "msg_assistant_15",
      role: "ASSISTANT",
      content: "I found a few fitness events on campus.",
    });
    const streamText = createStreamTextStub(async () => [
      "I found a few fitness events on campus.",
    ]);

    vi.mocked(mockPrisma.message.create)
      .mockResolvedValueOnce(userMessage as never)
      .mockResolvedValueOnce(assistantMessage as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([userMessage] as never);

    const res = await postMessage(createTestApp({ streamText }), userMessage.content);

    expect(res.status).toBe(200);
    expect(decodeSseText(await res.text())).toBe(
      "I found a few fitness events on campus.",
    );
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
          content: "I found a few fitness events on campus.",
          parts: [
            {
              type: "reply-suggestions",
              toolName: "suggestReplies",
              suggestions: [
                "Show me more fitness events",
                "Only free options",
                "What about this weekend?",
              ],
            },
          ],
        }),
      }),
    );
  });
});
