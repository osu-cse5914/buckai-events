import { app } from "./app";

const port = Number(process.env.PORT ?? 3001);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Playwright API server listening on http://localhost:${port}`);
