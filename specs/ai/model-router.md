# AI Model Router

## Overview

The AI model router is a shared module that centralizes all AI model configuration. Every AI-powered feature (chatbot, tagging, title generation, embeddings) routes through this module. This allows configuring providers, models, and task assignments in one place, swapping models without changing business logic, and using different models for different tasks.

## Architecture: Provider → Model → Task

```
┌─────────────────────────────────────────────────┐
│                   AI Config                      │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ Provider │   │ Provider │   │ Provider │    │
│  │ google   │   │ openai   │   │ local    │    │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘    │
│       │              │              │           │
│  ┌────┴─────┐   ┌────┴─────┐   ┌───┴──────┐   │
│  │  Model   │   │  Model   │   │  Model   │   │
│  │ gemini-  │   │ text-    │   │ custom   │   │
│  │ 2.0-flash│   │ embed-3  │   │ reranker │   │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   │
│       │              │              │           │
│  ┌────┴─────┐   ┌────┴─────┐   ┌───┴──────┐   │
│  │  Tasks   │   │  Tasks   │   │  Tasks   │   │
│  │ chatbot  │   │ embed    │   │ rerank   │   │
│  │ tagging  │   │          │   │          │   │
│  │ title-gen│   │          │   │          │   │
│  └──────────┘   └──────────┘   └──────────┘   │
└─────────────────────────────────────────────────┘
```

## Layer 1: Providers

A provider represents an AI service endpoint. One provider can serve multiple models.

| Field | Type | Notes |
|-------|------|-------|
| id | String | Unique identifier (e.g., `google`, `openai`) |
| type | ProviderType | `GOOGLE`, `OPENAI`, `ANTHROPIC`, `CUSTOM` |
| apiKey | String | Secret, loaded from environment variable |
| baseUrl | String? | Override for custom/self-hosted endpoints |
| rateLimit | Int? | Max requests per minute (optional) |

### Default Provider

The initial deployment uses Google as the sole provider. The system is designed to support additional providers without code changes — only configuration changes.

## Layer 2: Models

A model is a specific AI model available through a provider. One model can be assigned to multiple tasks.

| Field | Type | Notes |
|-------|------|-------|
| id | String | Unique identifier (e.g., `gemini-flash`, `text-embed`) |
| providerId | String | FK → Provider |
| modelId | String | The provider's model identifier (e.g., `gemini-2.0-flash`, `text-embedding-004`) |
| type | ModelType | `GENERATIVE` or `EMBEDDING` |
| maxTokens | Int? | Max output tokens for generative models |
| dimensions | Int? | Embedding dimensions for embedding models |

### Initial Models

| id | Provider | modelId | Type | Purpose |
|----|----------|---------|------|---------|
| gemini-flash | google | gemini-2.0-flash | GENERATIVE | Fast generative tasks |
| gemini-pro | google | gemini-2.0-pro | GENERATIVE | Complex generative tasks |
| text-embed | google | text-embedding-004 | EMBEDDING | Event and query embeddings |

## Layer 3: Tasks

A task maps a specific AI use case to a model. Each task has its own configuration (system prompt, temperature, etc.).

| Field | Type | Notes |
|-------|------|-------|
| id | String | Task identifier (e.g., `chatbot`, `tagging`) |
| modelId | String | FK → Model |
| systemPrompt | String? | Task-specific system instructions |
| temperature | Float? | 0.0–2.0 |
| maxOutputTokens | Int? | Per-task override |

### Defined Tasks

| Task ID | Model | Purpose | Temperature |
|---------|-------|---------|-------------|
| `chatbot` | gemini-pro | Agentic event discovery chatbot | 0.7 |
| `tagging` | gemini-flash | Auto-generate tags, category, summary for events | 0.3 |
| `title-generation` | gemini-flash | Auto-generate conversation titles | 0.5 |
| `embedding` | text-embed | Generate embeddings for events and search queries | N/A |

## Configuration Storage

The Provider → Model → Task configuration is stored as a typed configuration object in the API codebase, loaded from environment variables for secrets and a config file for structure. It is not stored in the database.

```typescript
// Example structure (not prescriptive)
interface AIConfig {
  providers: Record<string, ProviderConfig>
  models: Record<string, ModelConfig>
  tasks: Record<string, TaskConfig>
}
```

## Behaviors

### Task Resolution

When a feature needs AI (e.g., event creation triggers tagging), it calls the model router with the task ID. The router resolves: task → model → provider, builds the appropriate client, and executes the request.

### Model Swapping

Changing which model handles a task requires only updating the task's `modelId` in config. No business logic changes needed. Example: switching chatbot from `gemini-pro` to an OpenAI model requires adding an `openai` provider, adding the model, and pointing the `chatbot` task to it.

### Fallback

If a provider is unavailable, the router returns an error to the caller. Each caller handles AI failure according to its own spec (e.g., tagging → proceed with empty tags, chatbot → return error message). The model router does not implement retries or fallback chains — that is the caller's responsibility.

### Vercel AI SDK Integration

The model router produces provider-specific client instances compatible with the Vercel AI SDK (`ai` package). Generative tasks use `generateText()` or `streamText()`. Embedding tasks use `embedMany()` or `embed()`.

## Scenarios

### S-AI-1: Resolve task to model and provider

```
GIVEN task "tagging" is configured with modelId "gemini-flash"
AND model "gemini-flash" is configured with providerId "google"
WHEN the tagging feature requests the model router for task "tagging"
THEN the router returns a Google Gemini client configured with model "gemini-2.0-flash"
```

### S-AI-2: Model swap without code change

```
GIVEN task "chatbot" is configured with modelId "gemini-pro"
WHEN the config is updated to set task "chatbot" modelId to "gpt-4o"
AND model "gpt-4o" is configured with providerId "openai"
THEN the chatbot feature now uses OpenAI GPT-4o without any code changes
```

### S-AI-3: Provider unavailable

```
GIVEN the Google provider's API is down
WHEN the tagging feature requests the model router for task "tagging"
THEN the router throws a provider-unavailable error
AND the tagging caller handles it by proceeding with empty tags
```

### S-AI-4: Unknown task ID

```
GIVEN no task is configured with id "nonexistent"
WHEN a feature requests the model router for task "nonexistent"
THEN the router throws a configuration error
```

### S-AI-5: Embedding task returns vectors

```
GIVEN task "embedding" is configured with modelId "text-embed"
WHEN the embedding feature sends text "Jazz Night at the Union"
THEN the router returns a vector of the configured dimensions
```
