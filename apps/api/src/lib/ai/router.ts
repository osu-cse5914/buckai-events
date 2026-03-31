import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { EmbeddingModel, LanguageModel } from "ai";

export const AI_PROVIDER_TYPES = ["GOOGLE", "OPENAI_COMPATIBLE"] as const;
export const AI_MODEL_TYPES = ["GENERATIVE", "EMBEDDING"] as const;
export const AI_TASK_IDS = [
  "chatbot",
  "tagging",
  "title-generation",
  "embedding",
] as const;

export type AIProviderType = (typeof AI_PROVIDER_TYPES)[number];
export type AIModelType = (typeof AI_MODEL_TYPES)[number];
export type AITaskId = (typeof AI_TASK_IDS)[number];
export type AIEnvironment = Record<string, string | undefined> | undefined;

export type AIProviderConfig = {
  id: string;
  type: AIProviderType;
  apiKeyEnvVar?: string;
  baseUrl?: string;
  rateLimit?: number;
};

export type AIModelConfig = {
  id: string;
  providerId: string;
  modelId: string;
  type: AIModelType;
  maxTokens?: number;
  dimensions?: number;
};

export type AITaskConfig = {
  id: string;
  modelId: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AIConfig = {
  providers: Record<string, AIProviderConfig>;
  models: Record<string, AIModelConfig>;
  tasks: Record<string, AITaskConfig>;
};

export type AIConfigOverrides = Partial<AIConfig>;

export type ResolvedAITask = {
  task: AITaskConfig;
  model: AIModelConfig;
  provider: AIProviderConfig;
};

type LanguageModelFactory = (
  provider: AIProviderConfig,
  model: AIModelConfig,
  env: AIEnvironment,
) => LanguageModel;

type EmbeddingModelFactory = (
  provider: AIProviderConfig,
  model: AIModelConfig,
  env: AIEnvironment,
) => EmbeddingModel;

export type AIProviderAdapters = Partial<
  Record<
    AIProviderType,
    {
      languageModel?: LanguageModelFactory;
      embeddingModel?: EmbeddingModelFactory;
    }
  >
>;

type CreateAIModelRouterOptions = {
  config?: AIConfigOverrides;
  baseConfig?: AIConfig;
  adapters?: AIProviderAdapters;
  env?: AIEnvironment;
};

const CATEGORY_VOCABULARY = [
  "music",
  "sports",
  "tech",
  "arts",
  "academic",
  "social",
  "career",
  "food",
  "fitness",
  "gaming",
  "outdoors",
  "volunteering",
  "cultural",
  "science",
  "business",
  "other",
] as const;

const TAGGING_SYSTEM_PROMPT = [
  "You classify campus events into structured metadata.",
  "Return concise output only.",
  `Choose category from: ${CATEGORY_VOCABULARY.join(", ")}.`,
  "Tags should be short lowercase phrases suitable for event discovery.",
  "Summary should be a single short sentence.",
].join(" ");

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export class AIProviderUnavailableError extends Error {
  constructor(providerId: string, envVar: string) {
    super(`Provider "${providerId}" is unavailable; missing ${envVar}`);
    this.name = "AIProviderUnavailableError";
  }
}

function readEnvValue(env: AIEnvironment, key: string): string | undefined {
  const boundValue = env?.[key];
  if (typeof boundValue === "string" && boundValue.trim().length > 0) {
    return boundValue.trim();
  }

  const processValue = typeof process !== "undefined" ? process.env[key] : undefined;
  return processValue?.trim() ? processValue.trim() : undefined;
}

function requireProviderApiKey(
  provider: AIProviderConfig,
  env: AIEnvironment,
): string | undefined {
  if (!provider.apiKeyEnvVar) {
    return undefined;
  }

  const apiKey = readEnvValue(env, provider.apiKeyEnvVar);
  if (!apiKey) {
    throw new AIProviderUnavailableError(provider.id, provider.apiKeyEnvVar);
  }

  return apiKey;
}

const defaultAdapters: AIProviderAdapters = {
  GOOGLE: {
    languageModel(provider, model, env) {
      const google = createGoogleGenerativeAI({
        apiKey: requireProviderApiKey(provider, env),
        baseURL: provider.baseUrl,
      });

      return google(model.modelId as never);
    },
    embeddingModel(provider, model, env) {
      const google = createGoogleGenerativeAI({
        apiKey: requireProviderApiKey(provider, env),
        baseURL: provider.baseUrl,
      });

      return google.embeddingModel(model.modelId as never);
    },
  },
};

export function createDefaultAIConfig(env?: AIEnvironment): AIConfig {
  return {
    providers: {
      google: {
        id: "google",
        type: "GOOGLE",
        apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
        baseUrl: readEnvValue(env, "AI_GOOGLE_BASE_URL"),
      },
    },
    models: {
      "gemini-flash": {
        id: "gemini-flash",
        providerId: "google",
        modelId: readEnvValue(env, "AI_GOOGLE_FLASH_MODEL_ID") ?? "gemini-2.5-flash",
        type: "GENERATIVE",
        maxTokens: 1024,
      },
      "gemini-pro": {
        id: "gemini-pro",
        providerId: "google",
        modelId: readEnvValue(env, "AI_GOOGLE_PRO_MODEL_ID") ?? "gemini-2.5-pro",
        type: "GENERATIVE",
        maxTokens: 2048,
      },
      "text-embed": {
        id: "text-embed",
        providerId: "google",
        modelId:
          readEnvValue(env, "AI_GOOGLE_EMBEDDING_MODEL_ID") ??
          "gemini-embedding-001",
        type: "EMBEDDING",
        dimensions: 768,
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
        systemPrompt: TAGGING_SYSTEM_PROMPT,
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

export function createAIModelRouter({
  config,
  baseConfig,
  adapters = defaultAdapters,
  env,
}: CreateAIModelRouterOptions = {}) {
  const resolvedConfig = mergeAIConfig(
    baseConfig ?? createDefaultAIConfig(env),
    config,
  );

  function resolveTask(taskId: AITaskId | string): ResolvedAITask {
    const task = resolvedConfig.tasks[taskId];
    if (!task) {
      throw new AIConfigurationError(`Unknown AI task "${taskId}"`);
    }

    const model = resolvedConfig.models[task.modelId];
    if (!model) {
      throw new AIConfigurationError(
        `Task "${taskId}" references unknown model "${task.modelId}"`,
      );
    }

    const provider = resolvedConfig.providers[model.providerId];
    if (!provider) {
      throw new AIConfigurationError(
        `Model "${model.id}" references unknown provider "${model.providerId}"`,
      );
    }

    return { task, model, provider };
  }

  function getLanguageModel(taskId: AITaskId | string): LanguageModel {
    const resolved = resolveTask(taskId);
    if (resolved.model.type !== "GENERATIVE") {
      throw new AIConfigurationError(
        `Task "${taskId}" is configured with a non-generative model`,
      );
    }

    const adapter = adapters[resolved.provider.type]?.languageModel;
    if (!adapter) {
      throw new AIConfigurationError(
        `Provider type "${resolved.provider.type}" does not have a language-model adapter`,
      );
    }

    return adapter(resolved.provider, resolved.model, env);
  }

  function getEmbeddingModel(taskId: AITaskId | string): EmbeddingModel {
    const resolved = resolveTask(taskId);
    if (resolved.model.type !== "EMBEDDING") {
      throw new AIConfigurationError(
        `Task "${taskId}" is configured with a non-embedding model`,
      );
    }

    const adapter = adapters[resolved.provider.type]?.embeddingModel;
    if (!adapter) {
      throw new AIConfigurationError(
        `Provider type "${resolved.provider.type}" does not have an embedding adapter`,
      );
    }

    return adapter(resolved.provider, resolved.model, env);
  }

  return {
    config: resolvedConfig,
    resolveTask,
    getLanguageModel,
    getEmbeddingModel,
  };
}

function mergeAIConfig(baseConfig: AIConfig, overrides?: AIConfigOverrides): AIConfig {
  if (!overrides) {
    return baseConfig;
  }

  return {
    providers: {
      ...baseConfig.providers,
      ...overrides.providers,
    },
    models: {
      ...baseConfig.models,
      ...overrides.models,
    },
    tasks: {
      ...baseConfig.tasks,
      ...overrides.tasks,
    },
  };
}
