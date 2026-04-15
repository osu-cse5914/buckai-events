import { generateText } from "ai";
import { describe, expect, it, vi } from "vitest";
import {
  AIConfigurationError,
  AIProviderUnavailableError,
  createAIModelRouter,
  type AIConfig,
} from "../lib/ai/router";

function buildAIConfig(): AIConfig {
  return {
    providers: {
      google: {
        id: "google",
        type: "GOOGLE",
        apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
      },
      openai: {
        id: "openai",
        type: "OPENAI_COMPATIBLE",
        apiKeyEnvVar: "OPENAI_PRIMARY_API_KEY",
        baseUrl: "https://example.com/v1",
      },
      "cf-aig": {
        id: "cf-aig",
        type: "CF_AI_GATEWAY",
        apiKeyEnvVar: "CF_AIG_TOKEN",
        accountId: "2b7085f62464ab452fbd1c9569cedaef",
        gateway: "esperta-gateway",
      },
    },
    models: {
      "gemini-flash": {
        id: "gemini-flash",
        providerId: "google",
        modelId: "gemini-2.5-flash",
        type: "GENERATIVE",
        maxTokens: 1024,
        contextWindow: 1_000_000,
      },
      "gemini-pro": {
        id: "gemini-pro",
        providerId: "google",
        modelId: "gemini-2.5-pro",
        type: "GENERATIVE",
        maxTokens: 2048,
        contextWindow: 262_144,
      },
      "text-embed": {
        id: "text-embed",
        providerId: "google",
        modelId: "gemini-embedding-001",
        type: "EMBEDDING",
        dimensions: 768,
        contextWindow: 131_072,
      },
      gpt4o: {
        id: "gpt4o",
        providerId: "openai",
        modelId: "gpt-4o",
        type: "GENERATIVE",
      },
      "social-osu": {
        id: "social-osu",
        providerId: "cf-aig",
        modelId: "MiniMax-M2.7",
        type: "GENERATIVE",
        gatewayProviderId: "custom-minimax-china",
        chatCompletionsPath: "/v1/text/chatcompletion_v2",
        maxTokens: 2048,
        contextWindow: 1_000_000,
      },
      "social-osu-embedding": {
        id: "social-osu-embedding",
        providerId: "cf-aig",
        modelId: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
        type: "EMBEDDING",
        gatewayProviderId: "openrouter",
        gatewayBasePath: "/v1",
        dimensions: 768,
        contextWindow: 131_072,
      },
    },
    tasks: {
      chatbot: {
        id: "chatbot",
        modelId: "gemini-pro",
        temperature: 0.7,
      },
      tagging: {
        id: "tagging",
        modelId: "gemini-flash",
        temperature: 0.3,
        maxOutputTokens: 300,
      },
      "title-generation": {
        id: "title-generation",
        modelId: "gemini-flash",
        temperature: 0.5,
        maxOutputTokens: 80,
      },
      embedding: {
        id: "embedding",
        modelId: "text-embed",
      },
    },
  };
}

function buildEnv(config = buildAIConfig()) {
  return {
    AI_ROUTER_CONFIG_JSON: JSON.stringify(config),
    GOOGLE_GENERATIVE_AI_API_KEY: "google_test_key",
    OPENAI_PRIMARY_API_KEY: "openai_test_key",
    CF_AIG_TOKEN: "cf_aig_test_key",
  };
}

describe("[phase:4] [regression:always] AI model router", () => {
  it("TC-AI-001: resolves the tagging task to the Google flash model from env config", () => {
    const router = createAIModelRouter({
      env: buildEnv(),
    });

    const resolved = router.resolveTask("tagging");

    expect(resolved.task.id).toBe("tagging");
    expect(resolved.model.id).toBe("gemini-flash");
    expect(resolved.model.modelId).toBe("gemini-2.5-flash");
    expect(resolved.model.contextWindow).toBe(1_000_000);
    expect(resolved.provider.id).toBe("google");
    expect(resolved.provider.type).toBe("GOOGLE");
    expect(router.getLanguageModel("tagging")).toBeDefined();
  });

  it("TC-AI-002: supports swapping chatbot to an OpenAI-compatible model via config only", () => {
    const config = buildAIConfig();
    config.tasks.chatbot.modelId = "gpt4o";

    const router = createAIModelRouter({
      config,
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "google_test_key",
        OPENAI_PRIMARY_API_KEY: "openai_test_key",
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
    expect(router.getLanguageModel("chatbot")).toBeDefined();
  });

  it("TC-AI-003: throws a provider-unavailable error when the provider secret is missing", () => {
    const router = createAIModelRouter({
      env: {
        AI_ROUTER_CONFIG_JSON: JSON.stringify(buildAIConfig()),
      },
    });

    expect(() => router.getLanguageModel("tagging")).toThrow(AIProviderUnavailableError);
  });

  it("TC-AI-006: supports swapping chatbot to a Cloudflare custom-provider route via config only", async () => {
    const config = JSON.parse(JSON.stringify(buildAIConfig())) as AIConfig;
    config.providers["cf-aig-custom"] = {
      id: "cf-aig-custom",
      type: "CF_AI_GATEWAY",
      apiKeyEnvVar: "CF_AIG_TOKEN",
      accountId: "test-account-id",
      gateway: "test-gateway",
      customProviderId: "custom-regional-llm",
      chatCompletionsPath: "/api/v2/chat/completions",
    };
    config.models["social-osu"] = {
      id: "social-osu",
      providerId: "cf-aig-custom",
      modelId: "regional-model-v1",
      type: "GENERATIVE",
      maxTokens: 2048,
      contextWindow: 1_000_000,
    };
    config.tasks.chatbot.modelId = "social-osu";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 0,
          model: "regional-model-v1",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Config-driven route works",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const router = createAIModelRouter({
        env: {
          AI_ROUTER_CONFIG_JSON: JSON.stringify(config),
          CF_AIG_TOKEN: "cf_aig_test_key",
        },
      });

      const chatbot = router.resolveTask("chatbot");

      expect(chatbot.provider.id).toBe("cf-aig-custom");
      expect(chatbot.provider.type).toBe("CF_AI_GATEWAY");
      expect(chatbot.model.id).toBe("social-osu");

      const result = await generateText({
        model: router.getLanguageModel("chatbot"),
        prompt: "Hello",
        temperature: 0,
        maxOutputTokens: 32,
      });

      expect(result.text).toBe("Config-driven route works");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe(
        "https://gateway.ai.cloudflare.com/v1/test-account-id/test-gateway/custom-regional-llm/api/v2/chat/completions",
      );

      const requestBody = JSON.parse(String(init?.body ?? ""));
      expect(requestBody.model).toBe("regional-model-v1");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("TC-AI-007: supports swapping embedding to a Cloudflare AI Gateway model via config only", () => {
    const config = buildAIConfig();
    config.tasks.embedding.modelId = "social-osu-embedding";

    const router = createAIModelRouter({
      config,
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "google_test_key",
        OPENAI_PRIMARY_API_KEY: "openai_test_key",
        CF_AIG_TOKEN: "cf_aig_test_key",
      },
    });

    const embedding = router.resolveTask("embedding");

    expect(embedding.provider.id).toBe("cf-aig");
    expect(embedding.provider.type).toBe("CF_AI_GATEWAY");
    expect(embedding.model.id).toBe("social-osu-embedding");
    expect(embedding.model.modelId).toBe("nvidia/llama-nemotron-embed-vl-1b-v2:free");
    expect(embedding.model.dimensions).toBe(768);
    expect(router.getEmbeddingModel("embedding")).toBeDefined();
  });

  it("TC-AI-004: throws configuration errors for missing config, invalid config, and unknown task ids", () => {
    // Bun auto-loads .env, which may contain AI_ROUTER_CONFIG_JSON. Clear it so
    // the no-args call exercises the "missing config" error path.
    vi.stubEnv("AI_ROUTER_CONFIG_JSON", "");
    expect(() => createAIModelRouter()).toThrow(AIConfigurationError);
    vi.unstubAllEnvs();
    expect(() =>
      createAIModelRouter({
        env: {
          AI_ROUTER_CONFIG_JSON: "{not-json}",
        },
      }),
    ).toThrow(AIConfigurationError);
    expect(() =>
      createAIModelRouter({
        env: {
          AI_ROUTER_CONFIG_JSON: JSON.stringify({
            ...buildAIConfig(),
            tasks: {
              ...buildAIConfig().tasks,
              tagging: {
                ...buildAIConfig().tasks.tagging,
                systemPrompt: "should live in code",
              },
            },
          }),
        },
      }),
    ).toThrow(AIConfigurationError);
    expect(() =>
      createAIModelRouter({
        env: {
          AI_ROUTER_CONFIG_JSON: JSON.stringify({
            ...buildAIConfig(),
            tasks: {
              ...buildAIConfig().tasks,
              tagging: {
                ...buildAIConfig().tasks.tagging,
                temperature: 3,
              },
            },
          }),
        },
      }),
    ).toThrow(AIConfigurationError);

    const invalidConfig = buildAIConfig();
    invalidConfig.tasks.tagging.modelId = "missing-model";

    expect(() =>
      createAIModelRouter({
        config: invalidConfig,
      }),
    ).toThrow(AIConfigurationError);

    const unknownProviderConfig = buildAIConfig();
    unknownProviderConfig.models["gemini-flash"].providerId = "missing-provider";

    expect(() =>
      createAIModelRouter({
        config: unknownProviderConfig,
      }),
    ).toThrow(AIConfigurationError);

    const routerWithMissingAdapter = buildAIConfig();

    expect(() =>
      createAIModelRouter({
        config: routerWithMissingAdapter,
        adapters: {
          GOOGLE: {
            languageModel: () => ({ kind: "fake-google-language-model" }) as never,
            embeddingModel: () => ({ kind: "fake-google-embedding-model" }) as never,
          },
        },
      }),
    ).toThrow(AIConfigurationError);

    const router = createAIModelRouter({
      env: buildEnv(),
    });

    expect(() => router.resolveTask("nonexistent" as never)).toThrow(AIConfigurationError);
  });

  it("TC-AI-005: resolves the embedding task to the configured embedding model", () => {
    const config = buildAIConfig();
    config.models["text-embed"].modelId = "custom-embedding-model";

    const router = createAIModelRouter({
      env: buildEnv(config),
    });

    const resolved = router.resolveTask("embedding");

    expect(resolved.model.id).toBe("text-embed");
    expect(resolved.model.type).toBe("EMBEDDING");
    expect(resolved.model.modelId).toBe("custom-embedding-model");
    expect(router.getEmbeddingModel("embedding")).toBeDefined();
  });
});
