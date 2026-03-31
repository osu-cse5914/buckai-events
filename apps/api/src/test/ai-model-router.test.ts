import { describe, expect, it } from "vitest";
import {
  AIConfigurationError,
  AIProviderUnavailableError,
  createAIModelRouter,
  type AIConfig,
  type AIProviderAdapters,
} from "../lib/ai/router";

describe("[phase:4] [regression:always] AI model router", () => {
  it("TC-AI-001: resolves the tagging task to the Google flash model", () => {
    const router = createAIModelRouter({
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "google_test_key",
      },
    });

    const resolved = router.resolveTask("tagging");

    expect(resolved.task.id).toBe("tagging");
    expect(resolved.model.id).toBe("gemini-flash");
    expect(resolved.model.modelId).toBe("gemini-2.5-flash");
    expect(resolved.provider.id).toBe("google");
    expect(resolved.provider.type).toBe("GOOGLE");
    expect(router.getLanguageModel("tagging")).toBeDefined();
  });

  it("TC-AI-002: supports swapping chatbot to an OpenAI-compatible model via config only", () => {
    const config: AIConfig = {
      providers: {
        openai: {
          id: "openai",
          type: "OPENAI_COMPATIBLE",
          apiKeyEnvVar: "OPENAI_COMPATIBLE_API_KEY",
          baseUrl: "https://example.com/v1",
        },
      },
      models: {
        gpt4o: {
          id: "gpt4o",
          providerId: "openai",
          modelId: "gpt-4o",
          type: "GENERATIVE",
        },
      },
      tasks: {
        chatbot: {
          id: "chatbot",
          modelId: "gpt4o",
          temperature: 0.7,
        },
      },
    };

    const adapters: AIProviderAdapters = {
      OPENAI_COMPATIBLE: {
        languageModel: (_provider, model) =>
          ({
            kind: "fake-openai-language-model",
            modelId: model.modelId,
          }) as never,
      },
    };

    const router = createAIModelRouter({
      config,
      adapters,
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "google_test_key",
        OPENAI_COMPATIBLE_API_KEY: "openai_test_key",
      },
    });

    const chatbot = router.resolveTask("chatbot");
    const tagging = router.resolveTask("tagging");
    const embedding = router.resolveTask("embedding");

    expect(chatbot.provider.id).toBe("openai");
    expect(chatbot.provider.type).toBe("OPENAI_COMPATIBLE");
    expect(chatbot.model.modelId).toBe("gpt-4o");
    expect(tagging.provider.id).toBe("google");
    expect(tagging.model.id).toBe("gemini-flash");
    expect(embedding.provider.id).toBe("google");
    expect(embedding.model.id).toBe("text-embed");
    expect(router.getLanguageModel("chatbot")).toEqual({
      kind: "fake-openai-language-model",
      modelId: "gpt-4o",
    });
  });

  it("TC-AI-003: throws a provider-unavailable error when the provider secret is missing", () => {
    const router = createAIModelRouter();

    expect(() => router.getLanguageModel("tagging")).toThrow(
      AIProviderUnavailableError,
    );
  });

  it("TC-AI-004: throws a configuration error for an unknown task id", () => {
    const router = createAIModelRouter({
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "google_test_key",
      },
    });

    expect(() => router.resolveTask("nonexistent" as never)).toThrow(
      AIConfigurationError,
    );
  });

  it("TC-AI-005: resolves the embedding task to the configured embedding model", () => {
    const router = createAIModelRouter({
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "google_test_key",
        AI_GOOGLE_EMBEDDING_MODEL_ID: "gemini-embedding-001",
      },
    });

    const resolved = router.resolveTask("embedding");

    expect(resolved.model.id).toBe("text-embed");
    expect(resolved.model.type).toBe("EMBEDDING");
    expect(resolved.model.modelId).toBe("gemini-embedding-001");
    expect(router.getEmbeddingModel("embedding")).toBeDefined();
  });
});
