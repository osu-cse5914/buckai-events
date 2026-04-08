import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateConversationTitle } from "../services/conversation-titles";
import { buildConversation } from "./factories";
import { createMockPrisma } from "./helpers/prisma";

describe("[phase:6] [regression:always] Conversation title generation", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mockPrisma.conversation.update).mockResolvedValue(
      buildConversation({
        id: "conv_title_1",
        title: "Fitness events this weekend",
      }) as never,
    );
  });

  it("TC-CONV-010: falls back to a message-derived title when the model echoes prompt instructions", async () => {
    await generateConversationTitle({
      prisma: mockPrisma,
      conversationId: "conv_title_1",
      firstMessageContent: "What fitness events are happening this weekend?",
      generateText: vi.fn().mockResolvedValue({
        text: [
          "User wants a concise title for a Social OSU conversation",
          "max 5 words no quotes or punctuation decoration",
          "Title should reflect conversation about fitness events",
        ].join(" "),
      }),
      resolveTitleModel: () => ({
        model: "mock-model",
        temperature: 0,
        maxOutputTokens: 32,
      }),
    });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { id: "conv_title_1" },
      data: { title: "Fitness events this weekend" },
    });
  });
});
