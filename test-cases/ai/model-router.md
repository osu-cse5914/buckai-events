# AI Model Router Test Cases

Spec: [`model-router`](../../specs/ai/model-router.md)

---

## TC-AI-001: Resolve task to model and provider

- **Spec scenario**: S-AI-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/ai-model-router.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Task `"tagging"` is configured with modelId `"gemini-flash"`, which has providerId `"google"`
- **When**: The tagging feature requests the model router for task `"tagging"`
- **Then**: The router returns a Google Gemini client configured with model `"gemini-2.0-flash"`

## TC-AI-002: Model swap without code change

- **Spec scenario**: S-AI-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/ai-model-router.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Task `"chatbot"` is configured with modelId `"gemini-pro"`
- **When**: Config is updated to set `"chatbot"` modelId to `"gpt-4o"` with provider `"openai"`
- **Then**: The chatbot now uses OpenAI GPT-4o without code changes

## TC-AI-003: Provider unavailable

- **Spec scenario**: S-AI-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/ai-model-router.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The Google provider's API is down
- **When**: The tagging feature requests the model router
- **Then**: The router throws a provider-unavailable error; caller handles gracefully

## TC-AI-004: Unknown task ID

- **Spec scenario**: S-AI-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/ai-model-router.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: No task is configured with id `"nonexistent"`
- **When**: A feature requests the model router for task `"nonexistent"`
- **Then**: The router throws a configuration error

## TC-AI-005: Embedding task returns vectors

- **Spec scenario**: S-AI-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/ai-model-router.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Task `"embedding"` is configured with modelId `"text-embed"`
- **When**: The embedding feature sends text
- **Then**: The router returns a vector of the configured dimensions

## TC-AI-006: Cloudflare AI Gateway custom-provider route swap

- **Spec scenario**: S-AI-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/ai-model-router.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Task `"chatbot"` is configured with modelId `"gemini-pro"`
- **When**: Config is updated to set `"chatbot"` modelId to a model behind a Cloudflare AI Gateway custom provider route
- **Then**: The chatbot uses the configured custom provider endpoint without application code changes

## TC-AI-007: Cloudflare AI Gateway embedding route swap

- **Spec scenario**: S-AI-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/ai-model-router.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Task `"embedding"` is configured with modelId `"text-embed"`
- **When**: Config is updated to set `"embedding"` modelId to `"social-osu-embedding"` with provider `"cf-aig"`
- **Then**: The router returns an AI Gateway OpenRouter embedding model configured with `"nvidia/llama-nemotron-embed-vl-1b-v2:free"`

## TC-AI-008: Live chatbot route smoke test

- **Spec scenario**: S-AI-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/live/ai-live.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: `AI_ROUTER_CONFIG_JSON` points `"chatbot"` at the desired live generative route
- **When**: The live AI smoke test runs against the configured Cloudflare AI Gateway
- **Then**: The chatbot task returns non-empty text from the real API

## TC-AI-009: Live embedding route smoke test

- **Spec scenario**: S-AI-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/live/ai-live.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: `AI_ROUTER_CONFIG_JSON` points `"embedding"` at the desired live embedding route
- **When**: The live AI smoke test runs against the configured Cloudflare AI Gateway
- **Then**: The embedding task returns a vector whose length matches the configured dimensions
