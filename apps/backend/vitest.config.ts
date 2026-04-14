import { defineConfig } from "vitest/config";

// When path aliases are added to tsconfig.json (e.g. "@/*": ["./src/*"]),
// mirror them here under resolve.alias so Vitest can resolve them in tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/test/runtime/**", "src/test/live/**"],
    setupFiles: ["./setupTests.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/test/**"],
      thresholds: {
        statements: 60,
      },
    },
  },
});
