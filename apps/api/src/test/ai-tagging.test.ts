import { describe, expect, it, vi } from "vitest";
import { AIProviderUnavailableError } from "../lib/ai/router";
import { generateEventTagging } from "../services/ai-tagging";

describe("[phase:4] [regression:always] AI tagging service", () => {
  it("normalizes structured tagging output to the event schema limits", async () => {
    const result = await generateEventTagging(
      {
        title: "Jazz Night at the Union",
        description: "Live jazz performance featuring student musicians.",
      },
      {
        router: {
          resolveTask: () => ({
            task: {
              id: "tagging",
              modelId: "gemini-flash",
              systemPrompt: "test prompt",
              temperature: 0.3,
              maxOutputTokens: 300,
            },
            model: {
              id: "gemini-flash",
              providerId: "google",
              modelId: "gemini-2.5-flash",
              type: "GENERATIVE",
            },
            provider: {
              id: "google",
              type: "GOOGLE",
              apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
            },
          }),
          getLanguageModel: () => ({ kind: "fake-language-model" }) as never,
        },
        generateText: vi.fn().mockResolvedValue({
          output: {
            tags: [
              " Jazz ",
              "MUSIC",
              "music",
              "",
              "tag-that-is-way-too-long-to-keep-because-it-exceeds-fifty-characters",
            ],
            summary: "  A great live set from student musicians.  ",
            category: " Music ",
          },
        }),
      },
    );

    expect(result).toEqual({
      tags: ["jazz", "music"],
      summary: "A great live set from student musicians.",
      category: "music",
    });
  });

  it("surfaces provider failures to the caller", async () => {
    await expect(
      generateEventTagging(
        {
          title: "Hackathon",
          description: "24hr build sprint.",
        },
        {
          router: {
            resolveTask: () => ({
              task: {
                id: "tagging",
                modelId: "gemini-flash",
              },
              model: {
                id: "gemini-flash",
                providerId: "google",
                modelId: "gemini-2.5-flash",
                type: "GENERATIVE",
              },
              provider: {
                id: "google",
                type: "GOOGLE",
                apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
              },
            }),
            getLanguageModel: () => {
              throw new AIProviderUnavailableError(
                "google",
                "GOOGLE_GENERATIVE_AI_API_KEY",
              );
            },
          },
        },
      ),
    ).rejects.toThrow(AIProviderUnavailableError);
  });
});
