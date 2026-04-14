import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/live/**/*.test.ts"],
    testTimeout: 60000,
    setupFiles: ["./setupTests.ts"],
    coverage: {
      provider: "istanbul",
    },
  },
});
