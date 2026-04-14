import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  createOpenAICompatible,
  OpenAICompatibleChatLanguageModel,
} from "@ai-sdk/openai-compatible";
import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import type { EmbeddingModel, LanguageModel } from "ai";
import { z } from "zod";

export const AI_PROVIDER_TYPES = [
  "GOOGLE",
  "OPENAI_COMPATIBLE",
  "CF_AI_GATEWAY",
] as const;
export const AI_MODEL_TYPES = ["GENERATIVE", "EMBEDDING"] as const;

export type AIProviderType = (typeof AI_PROVIDER_TYPES)[number];
export type AIModelType = (typeof AI_MODEL_TYPES)[number];
export type AITaskId = string;
export type AIEnvironment = Record<string, string | undefined> | undefined;

export type AIProviderConfig = {
  id: string;
  type: AIProviderType;
  apiKeyEnvVar?: string;
  upstreamApiKeyEnvVar?: string;
  baseUrl?: string;
  accountId?: string;
  gateway?: string;
  headersEnv?: Record<string, string>;
  rateLimit?: number;
};

export type AIModelConfig = {
  id: string;
  providerId: string;
  modelId: string;
  type: AIModelType;
  maxTokens?: number;
  dimensions?: number;
  contextWindow?: number;
};

export type AITaskConfig = {
  id: string;
  modelId: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AIConfig = {
  providers: Record<string, AIProviderConfig>;
  models: Record<string, AIModelConfig>;
  tasks: Record<string, AITaskConfig>;
};

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
  config?: AIConfig;
  adapters?: AIProviderAdapters;
  env?: AIEnvironment;
};

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

const aiProviderConfigSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(AI_PROVIDER_TYPES),
    apiKeyEnvVar: z.string().min(1).optional(),
    upstreamApiKeyEnvVar: z.string().min(1).optional(),
    baseUrl: z.string().min(1).optional(),
    accountId: z.string().min(1).optional(),
    gateway: z.string().min(1).optional(),
    headersEnv: z.record(z.string().min(1)).optional(),
    rateLimit: z.number().int().positive().optional(),
  })
  .strict();

const aiModelConfigSchema = z
  .object({
    id: z.string().min(1),
    providerId: z.string().min(1),
    modelId: z.string().min(1),
    type: z.enum(AI_MODEL_TYPES),
    maxTokens: z.number().int().positive().optional(),
    dimensions: z.number().int().positive().optional(),
    contextWindow: z.number().int().positive().optional(),
  })
  .strict();

const aiTaskConfigSchema = z
  .object({
    id: z.string().min(1),
    modelId: z.string().min(1),
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().positive().optional(),
  })
  .strict();

const aiConfigSchema = z
  .object({
    providers: z.record(aiProviderConfigSchema),
    models: z.record(aiModelConfigSchema),
    tasks: z.record(aiTaskConfigSchema),
  })
  .strict();

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
): string {
  if (!provider.apiKeyEnvVar?.trim()) {
    throw new AIConfigurationError(
      `Provider "${provider.id}" requires a non-empty apiKeyEnvVar`,
    );
  }

  const apiKey = readEnvValue(env, provider.apiKeyEnvVar);
  if (!apiKey) {
    throw new AIProviderUnavailableError(provider.id, provider.apiKeyEnvVar);
  }

  return apiKey;
}

function resolveProviderHeaders(
  provider: AIProviderConfig,
  env: AIEnvironment,
): Record<string, string> | undefined {
  if (!provider.headersEnv) {
    return undefined;
  }

  const entries = Object.entries(provider.headersEnv).map(([header, envVar]) => {
    const value = readEnvValue(env, envVar);
    if (!value) {
      throw new AIProviderUnavailableError(provider.id, envVar);
    }

    return [header, value] as const;
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function resolveOptionalProviderApiKey(
  provider: AIProviderConfig,
  env: AIEnvironment,
): string | undefined {
  if (!provider.upstreamApiKeyEnvVar?.trim()) {
    return undefined;
  }

  const apiKey = readEnvValue(env, provider.upstreamApiKeyEnvVar);
  if (!apiKey) {
    throw new AIProviderUnavailableError(provider.id, provider.upstreamApiKeyEnvVar);
  }

  return apiKey;
}

function requireProviderBaseUrl(provider: AIProviderConfig): string {
  if (provider.baseUrl?.trim()) {
    return provider.baseUrl.trim();
  }

  throw new AIConfigurationError(
    `Provider "${provider.id}" requires a non-empty baseUrl`,
  );
}

function requireProviderAccountId(provider: AIProviderConfig): string {
  if (provider.accountId?.trim()) {
    return provider.accountId.trim();
  }

  throw new AIConfigurationError(
    `Provider "${provider.id}" requires a non-empty accountId`,
  );
}

function requireProviderGateway(provider: AIProviderConfig): string {
  if (provider.gateway?.trim()) {
    return provider.gateway.trim();
  }

  throw new AIConfigurationError(
    `Provider "${provider.id}" requires a non-empty gateway`,
  );
}

function buildCloudflareAIGatewayCompatBaseUrl(
  provider: AIProviderConfig,
): string {
  const accountId = requireProviderAccountId(provider);
  const gateway = requireProviderGateway(provider);

  return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gateway}/compat`;
}

const MINIMAX_CUSTOM_PROVIDER_PREFIX = "custom-minimax";
const MINIMAX_CHAT_COMPLETIONS_PATH = "/v1/text/chatcompletion_v2";

function parseMiniMaxCustomProviderModelId(modelId: string): {
  providerSlug: string;
  providerModelId: string;
} | null {
  const separatorIndex = modelId.indexOf("/");
  if (separatorIndex <= 0) {
    return null;
  }

  const providerSlug = modelId.slice(0, separatorIndex);
  const providerModelId = modelId.slice(separatorIndex + 1);

  if (
    !providerSlug.startsWith(MINIMAX_CUSTOM_PROVIDER_PREFIX) ||
    providerModelId.length === 0
  ) {
    return null;
  }

  return {
    providerSlug,
    providerModelId,
  };
}

function buildCloudflareAIGatewayCustomProviderUrl(
  provider: AIProviderConfig,
  providerSlug: string,
  path: string,
): string {
  const accountId = requireProviderAccountId(provider);
  const gateway = requireProviderGateway(provider);

  return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gateway}/${providerSlug}${path}`;
}

function buildCloudflareAIGatewayHeaders(
  provider: AIProviderConfig,
  env: AIEnvironment,
): Record<string, string> {
  const headers: Record<string, string> = {
    "cf-aig-authorization": `Bearer ${requireProviderApiKey(provider, env)}`,
  };

  const upstreamApiKey = resolveOptionalProviderApiKey(provider, env);
  if (upstreamApiKey) {
    headers.Authorization = `Bearer ${upstreamApiKey}`;
  }

  return headers;
}

function createCloudflareMiniMaxLanguageModel(
  provider: AIProviderConfig,
  model: AIModelConfig,
  env: AIEnvironment,
): LanguageModel | null {
  const parsedModel = parseMiniMaxCustomProviderModelId(model.modelId);
  if (!parsedModel) {
    return null;
  }

  // MiniMax custom providers do not expose the OpenAI-style /chat/completions path.
  return new OpenAICompatibleChatLanguageModel(parsedModel.providerModelId, {
    provider: `${provider.id}.chat`,
    headers: () => buildCloudflareAIGatewayHeaders(provider, env),
    url: () =>
      buildCloudflareAIGatewayCustomProviderUrl(
        provider,
        parsedModel.providerSlug,
        MINIMAX_CHAT_COMPLETIONS_PATH,
      ),
  });
}

function validateIndexedIds<T extends { id: string }>(
  values: Record<string, T>,
  type: "provider" | "model" | "task",
) {
  for (const [key, value] of Object.entries(values)) {
    if (key !== value.id) {
      throw new AIConfigurationError(
        `AI ${type} key "${key}" must match id "${value.id}"`,
      );
    }
  }
}

export function validateAIConfig(config: AIConfig): AIConfig {
  validateIndexedIds(config.providers, "provider");
  validateIndexedIds(config.models, "model");
  validateIndexedIds(config.tasks, "task");

  for (const provider of Object.values(config.providers)) {
    if (
      provider.type === "OPENAI_COMPATIBLE" &&
      (!provider.baseUrl || provider.baseUrl.trim().length === 0)
    ) {
      throw new AIConfigurationError(
        `Provider "${provider.id}" requires a non-empty baseUrl`,
      );
    }

    if (
      provider.type === "OPENAI_COMPATIBLE" &&
      (!provider.apiKeyEnvVar || provider.apiKeyEnvVar.trim().length === 0) &&
      (!provider.headersEnv || Object.keys(provider.headersEnv).length === 0)
    ) {
      throw new AIConfigurationError(
        `Provider "${provider.id}" requires apiKeyEnvVar or headersEnv`,
      );
    }

    if (
      provider.type === "CF_AI_GATEWAY" &&
      (!provider.apiKeyEnvVar ||
        provider.apiKeyEnvVar.trim().length === 0 ||
        !provider.accountId ||
        provider.accountId.trim().length === 0 ||
        !provider.gateway ||
        provider.gateway.trim().length === 0)
    ) {
      throw new AIConfigurationError(
        `Provider "${provider.id}" requires non-empty accountId and gateway`,
      );
    }
  }

  for (const model of Object.values(config.models)) {
    if (!config.providers[model.providerId]) {
      throw new AIConfigurationError(
        `Model "${model.id}" references unknown provider "${model.providerId}"`,
      );
    }
  }

  for (const task of Object.values(config.tasks)) {
    if (!config.models[task.modelId]) {
      throw new AIConfigurationError(
        `Task "${task.id}" references unknown model "${task.modelId}"`,
      );
    }
  }

  return config;
}

export function parseAIConfig(rawConfig: string): AIConfig {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawConfig);
  } catch {
    throw new AIConfigurationError("AI router config is not valid JSON");
  }

  const result = aiConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new AIConfigurationError(
      `AI router config is invalid: ${issue?.message ?? "unknown validation error"}`,
    );
  }

  return validateAIConfig(result.data);
}

export function loadAIConfigFromEnv(env?: AIEnvironment): AIConfig {
  const rawConfig = readEnvValue(env, "AI_ROUTER_CONFIG_JSON");
  if (!rawConfig) {
    throw new AIConfigurationError(
      "Missing required AI router config env var AI_ROUTER_CONFIG_JSON",
    );
  }

  return parseAIConfig(rawConfig);
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
  OPENAI_COMPATIBLE: {
    languageModel(provider, model, env) {
      const headers = resolveProviderHeaders(provider, env);
      const openaiCompatible = createOpenAICompatible({
        name: provider.id,
        apiKey: provider.apiKeyEnvVar
          ? requireProviderApiKey(provider, env)
          : undefined,
        baseURL: requireProviderBaseUrl(provider),
        headers,
      });

      return openaiCompatible.languageModel(model.modelId as never);
    },
    embeddingModel(provider, model, env) {
      const headers = resolveProviderHeaders(provider, env);
      const openaiCompatible = createOpenAICompatible({
        name: provider.id,
        apiKey: provider.apiKeyEnvVar
          ? requireProviderApiKey(provider, env)
          : undefined,
        baseURL: requireProviderBaseUrl(provider),
        headers,
      });

      return openaiCompatible.embeddingModel(model.modelId as never);
    },
  },
  CF_AI_GATEWAY: {
    languageModel(provider, model, env) {
      const miniMaxModel = createCloudflareMiniMaxLanguageModel(
        provider,
        model,
        env,
      );
      if (miniMaxModel) {
        return miniMaxModel;
      }

      const gateway = createAiGateway({
        accountId: requireProviderAccountId(provider),
        gateway: requireProviderGateway(provider),
        apiKey: requireProviderApiKey(provider, env),
      });
      const unified = createUnified({
        apiKey: resolveOptionalProviderApiKey(provider, env),
      });

      return gateway(unified(model.modelId as never)) as never;
    },
    embeddingModel(provider, model, env) {
      const openaiCompatible = createOpenAICompatible({
        name: provider.id,
        baseURL: buildCloudflareAIGatewayCompatBaseUrl(provider),
        headers: {
          "cf-aig-authorization": `Bearer ${requireProviderApiKey(provider, env)}`,
        },
      });

      return openaiCompatible.embeddingModel(model.modelId as never);
    },
  },
};

export function createAIModelRouter({
  config,
  adapters = defaultAdapters,
  env,
}: CreateAIModelRouterOptions = {}) {
  const resolvedConfig = config ? validateAIConfig(config) : loadAIConfigFromEnv(env);
  validateAdapterCoverage(resolvedConfig, adapters);

  function resolveTask(taskId: AITaskId): ResolvedAITask {
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

  function getLanguageModel(taskId: AITaskId): LanguageModel {
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

  function getEmbeddingModel(taskId: AITaskId): EmbeddingModel {
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

function validateAdapterCoverage(config: AIConfig, adapters: AIProviderAdapters): void {
  for (const model of Object.values(config.models)) {
    const provider = config.providers[model.providerId];
    const adapter = adapters[provider.type];

    if (model.type === "GENERATIVE" && !adapter?.languageModel) {
      throw new AIConfigurationError(
        `Provider type "${provider.type}" does not have a language-model adapter`,
      );
    }

    if (model.type === "EMBEDDING" && !adapter?.embeddingModel) {
      throw new AIConfigurationError(
        `Provider type "${provider.type}" does not have an embedding adapter`,
      );
    }
  }
}
