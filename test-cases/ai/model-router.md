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
