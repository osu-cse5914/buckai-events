import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerApiErrorHandlers } from "../app";

function createErrorTestApp() {
  const app = new Hono();
  registerApiErrorHandlers(app);
  return app;
}

describe("[phase:6] [regression:always] API error handling", () => {
  it("TC-API-001: returns RFC 7807 problem details for unknown routes", async () => {
    const res = await createErrorTestApp().request("/api/missing");

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Route not found",
    });
  });

  it("TC-API-002: returns RFC 7807 problem details for uncaught exceptions", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = createErrorTestApp();
    app.get("/api/boom", () => {
      throw new Error("boom");
    });

    const res = await app.request("/api/boom");

    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("internal-error"),
      title: "Internal server error",
      status: 500,
      detail: "An unexpected error occurred",
    });

    consoleError.mockRestore();
  });
});
