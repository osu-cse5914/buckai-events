import { test, expect } from "@playwright/test";

test.describe("API health endpoints", () => {
  test("GET /api/health returns ok", async ({ request }) => {
    const res = await request.get("/api/health");

    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      service: "api",
    });
    expect(body.timestamp).toBeTruthy();
  });
});
