import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { Prisma } from "@prisma/client";

vi.mock("../lib/prisma");

import { getPrismaClient, getPrisma } from "../lib/prisma";
import { registerApiErrorHandlers } from "../app";
import { CHATBOT_SYSTEM_PROMPT } from "../services/chatbot";
import { createConversationsRouter } from "../routes/conversations";
import { createMockPrisma } from "./helpers/prisma";

const USER_A = { id: "user_a", clerkId: "clerk_a", email: "usera@osu.edu" };

const NOW = new Date("2026-04-01T12:00:00.000Z");

function createConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv_1",
    userId: USER_A.id,
    title: null,
    pendingAction: null,
    pendingActionCreatedAt: null,
    createdAt: new Date("2026-04-01T11:00:00.000Z"),
    updatedAt: new Date("2026-04-01T11:00:00.000Z"),
    ...overrides,
  };
}

function createMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg_1",
    conversationId: "conv_1",
    role: "USER",
    content: "hello",
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    ...overrides,
  };
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

function createTestApp({
  streamText,
  searchSemanticEvents,
  currentDate = () => NOW,
}: {
  streamText?: ReturnType<typeof createStreamTextStub>;
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

  it("TC-CHAT-006: system prompt restricts the assistant to OSU platform events and off-topic refusal", () => {
    expect(CHATBOT_SYSTEM_PROMPT).toContain("Ohio State University");
    expect(CHATBOT_SYSTEM_PROMPT).toContain("events, gigs, and campus activities");
    expect(CHATBOT_SYSTEM_PROMPT).toContain("decline");
    expect(CHATBOT_SYSTEM_PROMPT).toContain("confirm");
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
});
