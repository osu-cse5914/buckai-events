import { defineConfig } from "vitest/config";

// When path aliases are added to tsconfig.json (e.g. "@/*": ["./src/*"]),
// mirror them here under resolve.alias so Vitest can resolve them in tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/test/runtime/**", "src/test/live/**"],
    setupFiles: ["./setupTests.ts"],
    server: {
      deps: {
        // zod ≥3.25 (the v4 migration release) exports `z` as a namespace object
        // via `import * as z`. Vite's SSR transform can't resolve that re-export,
        // so we force-inline it so Vite bundles and transforms it correctly.
        inline: ["zod"],
      },
    },
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
