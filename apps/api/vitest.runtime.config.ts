import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/runtime/**/*.test.ts"],
    testTimeout: 30000,
    coverage: {
      provider: "istanbul",
    },
  },
});
