import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClerkGetUser = vi.fn();

vi.mock("@hono/clerk-auth", () => ({
  clerkMiddleware:
    () => async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
      c.set("clerk", { users: { getUser: mockClerkGetUser } });
      await next();
    },
  getAuth: vi.fn(),
}));

vi.mock("../lib/prisma");

import { getAuth } from "@hono/clerk-auth";
import { getPrismaClient, getPrisma } from "../lib/prisma";
import { app } from "../index";
import { buildMessage, buildUser, buildConversation } from "./factories";
import { createMockPrisma } from "./helpers/prisma";
import { makeAuthRequest } from "./helpers/context";

const FULL_USER_A = buildUser({
  id: "user_a",
  clerkId: "clerk_a",
  email: "usera@osu.edu",
  displayName: "User A",
  interests: [],
  followerCount: 0,
  followingCount: 0,
  createdAt: new Date("2026-04-01T10:00:00.000Z"),
  updatedAt: new Date("2026-04-01T10:00:00.000Z"),
});

const FULL_USER_B = buildUser({
  id: "user_b",
  clerkId: "clerk_b",
  email: "userb@osu.edu",
  displayName: "User B",
  interests: [],
  followerCount: 0,
  followingCount: 0,
  createdAt: new Date("2026-04-01T10:00:00.000Z"),
  updatedAt: new Date("2026-04-01T10:00:00.000Z"),
});

function createConversation(overrides: Record<string, unknown> = {}) {
  return buildConversation({
    userId: FULL_USER_A.id,
    ...overrides,
  });
}

function createMessage(overrides: Record<string, unknown> = {}) {
  return buildMessage(overrides);
}

function toJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("[phase:5] [regression:always] Conversations API", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER_A.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER_A as never);
  });

  it("TC-CONV-001: creates a new conversation for the authenticated user", async () => {
    const created = createConversation();
    vi.mocked(mockPrisma.conversation.create).mockResolvedValue(created as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/conversations", {
        method: "POST",
      }),
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
      data: {
        userId: FULL_USER_A.id,
        title: null,
      },
    });
    expect(await res.json()).toEqual(toJsonValue(created));
  });

  it("TC-CONV-002: lists the authenticated user's conversations ordered by updatedAt descending", async () => {
    const conversations = [
      createConversation({
        id: "conv_3",
        title: "Most recent",
        updatedAt: new Date("2026-04-01T13:00:00.000Z"),
      }),
      createConversation({
        id: "conv_2",
        title: "Middle",
        updatedAt: new Date("2026-04-01T12:00:00.000Z"),
      }),
      createConversation({
        id: "conv_1",
        title: "Oldest",
        updatedAt: new Date("2026-04-01T11:00:00.000Z"),
      }),
    ];

    vi.mocked(mockPrisma.conversation.findMany).mockResolvedValue(conversations as never);
    vi.mocked(mockPrisma.conversation.count).mockResolvedValue(3 as never);

    const res = await app.request(makeAuthRequest("/api/v1/conversations?limit=10&offset=5"));

    expect(res.status).toBe(200);
    expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
      where: { userId: FULL_USER_A.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      skip: 5,
    });
    expect(mockPrisma.conversation.count).toHaveBeenCalledWith({
      where: { userId: FULL_USER_A.id },
    });
    expect(await res.json()).toEqual({
      data: toJsonValue(conversations),
      pagination: {
        total: 3,
        limit: 10,
        offset: 5,
      },
    });
  });

  it("TC-CONV-011: deletes a conversation owned by the authenticated user", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation({ id: "conv_1" }) as never,
    );
    vi.mocked(mockPrisma.conversation.delete).mockResolvedValue(
      createConversation({ id: "conv_1" }) as never,
    );

    const res = await app.request(
      makeAuthRequest("/api/v1/conversations/conv_1", {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(204);
    expect(mockPrisma.conversation.delete).toHaveBeenCalledWith({
      where: { id: "conv_1" },
    });
  });

  it("TC-CONV-004: returns message history ordered by createdAt ascending", async () => {
    const messages = [
      createMessage({
        id: "msg_1",
        content: "first",
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
      }),
      createMessage({
        id: "msg_2",
        role: "ASSISTANT",
        content: "second",
        createdAt: new Date("2026-04-01T12:01:00.000Z"),
      }),
    ];

    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(createConversation() as never);
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue(messages as never);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(2 as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/conversations/conv_1/messages?limit=5&offset=1"),
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: "conv_1" },
      orderBy: { createdAt: "asc" },
      take: 5,
      skip: 1,
    });
    expect(mockPrisma.message.count).toHaveBeenCalledWith({
      where: { conversationId: "conv_1" },
    });
    expect(await res.json()).toEqual({
      data: toJsonValue(messages),
      pagination: {
        total: 2,
        limit: 5,
        offset: 1,
      },
    });
  });

  it("TC-CONV-005: returns 404 when accessing another user's conversation", async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER_B.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER_B as never);
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation({ userId: FULL_USER_A.id }) as never,
    );

    const res = await app.request(makeAuthRequest("/api/v1/conversations/conv_1/messages"));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Conversation not found",
    });
    expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
  });

  it("TC-AUTHZ-012: returns 404 when posting to another user's conversation", async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER_B.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER_B as never);
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      createConversation({ userId: FULL_USER_A.id }) as never,
    );

    const res = await app.request(
      makeAuthRequest("/api/v1/conversations/conv_1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "hello" }),
      }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Conversation not found",
    });
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });
});
