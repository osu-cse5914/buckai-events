import { embed, generateText } from "ai";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createAIModelRouter, type AIEnvironment } from "../../lib/ai/router";

function parseDotEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf8");
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1);

    if (value.startsWith("'") && !value.endsWith("'")) {
      const collected = [value.slice(1)];
      while (index + 1 < lines.length) {
        index += 1;
        const nextLine = lines[index] ?? "";
        if (nextLine.endsWith("'")) {
          collected.push(nextLine.slice(0, -1));
          break;
        }
        collected.push(nextLine);
      }
      result[key] = collected.join("\n");
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function loadDotEnv(): Record<string, string> {
  return parseDotEnvFile(resolve(process.cwd(), ".env"));
}

function readLiveEnvValue(name: string): string | undefined {
  const processValue = process.env[name]?.trim();
  if (processValue) {
    return processValue;
  }

  const dotEnvValue = loadDotEnv()[name]?.trim();
  if (dotEnvValue) {
    return dotEnvValue;
  }

  return undefined;
}

function requireLiveEnvValue(
  name: string,
  placeholder?: string,
): string {
  const value = readLiveEnvValue(name);

  if (!value || (placeholder && value === placeholder)) {
    throw new Error(
      `Live AI test requires ${name} to be set to a real value before running test:live:ai`,
    );
  }

  return value;
}

function loadLiveEnv(): AIEnvironment {
  const dotEnv = loadDotEnv();
  const env = {
    ...process.env,
    ...dotEnv,
  } satisfies Record<string, string | undefined>;

  requireLiveEnvValue("CF_AIG_TOKEN", "cf_aig_token_here");
  requireLiveEnvValue("AI_ROUTER_CONFIG_JSON");

  return env;
}

describe("[phase:4] [regression:always] Live AI Gateway smoke", () => {
  it("TC-AI-008: chatbot task reaches the live Cloudflare AI Gateway route", async () => {
    const env = loadLiveEnv();
    const router = createAIModelRouter({ env });
    const task = router.resolveTask("chatbot");

    expect(task.provider.type).toBe("CF_AI_GATEWAY");
    expect(task.model.type).toBe("GENERATIVE");

    const result = await generateText({
      model: router.getLanguageModel("chatbot"),
      temperature: 0,
      maxOutputTokens: 256,
      prompt:
        'Reply with the exact text "SOCIAL_OSU_LIVE_OK" and nothing else.',
    });

    expect(result.text.trim()).toContain("SOCIAL_OSU_LIVE_OK");
  }, 60_000);

  it("TC-AI-009: embedding task reaches the live Cloudflare AI Gateway route", async () => {
    const env = loadLiveEnv();
    const router = createAIModelRouter({ env });
    const task = router.resolveTask("embedding");

    expect(task.provider.type).toBe("OPENAI_COMPATIBLE");
    expect(task.model.modelId).toBe("nvidia/llama-nemotron-embed-vl-1b-v2:free");

    const result = await embed({
      model: router.getEmbeddingModel("embedding"),
      value: "Social OSU live embedding smoke test",
      providerOptions: {
        openrouter: {
          dimensions: task.model.dimensions,
        },
      },
    });

    expect(result.embedding).toHaveLength(task.model.dimensions ?? 0);
    expect(result.embedding.every((value) => Number.isFinite(value))).toBe(true);
  }, 60_000);
});
