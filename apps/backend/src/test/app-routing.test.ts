import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hono/clerk-auth", () => ({
  clerkMiddleware:
    () => async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
      c.set("clerkAuth", () => ({ userId: null }));
      await next();
    },
  getAuth: vi.fn(() => ({ userId: null })),
}));

vi.mock("../middleware/request-resources", () => ({
  withRequestResources: async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

import { createVersionedApiRouter, registerApiErrorHandlers } from "../app";

describe("[phase:6] [regression:always] Versioned API router mounting", () => {
  it("TC-API-003: mounts versioned routes under the parent prefix without route-level hardcoding", async () => {
    const app = new Hono();
    registerApiErrorHandlers(app);
    app.route("/internal-api", createVersionedApiRouter());

    const mountedResponse = await app.request("/internal-api/auth/me");
    const defaultPrefixResponse = await app.request("/api/v1/auth/me");

    expect(mountedResponse.status).toBe(401);
    expect(await mountedResponse.json()).toMatchObject({
      type: expect.stringContaining("unauthorized"),
      title: "Unauthorized",
      status: 401,
      detail: "Authentication is required",
    });

    expect(defaultPrefixResponse.status).toBe(404);
    expect(await defaultPrefixResponse.json()).toMatchObject({
      type: expect.stringContaining("not-found"),
      title: "Resource not found",
      status: 404,
      detail: "Route not found",
    });
  });
});
