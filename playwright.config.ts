import { defineConfig, devices } from "@playwright/test";

const backendPort = Number(process.env.PLAYWRIGHT_API_PORT ?? 3201);
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 5173);
const databaseUrl = process.env.PLAYWRIGHT_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",

  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command:
        `cd apps/backend && ${databaseUrl ? `DATABASE_URL='${databaseUrl}' ` : ""}PORT=${backendPort} E2E_TEST_AUTH_ENABLED=true bun src/playwright-server.ts`,
      port: backendPort,
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        `cd apps/web && VITE_API_URL=http://localhost:${backendPort} VITE_E2E_TEST_AUTH_ENABLED=true bun run dev -- --host 127.0.0.1 --port ${webPort}`,
      port: webPort,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
