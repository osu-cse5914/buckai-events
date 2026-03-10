import { defineConfig } from "vitest/config";

// When path aliases are added to tsconfig.json (e.g. "@/*": ["./src/*"]),
// mirror them here under resolve.alias so Vitest can resolve them in tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
