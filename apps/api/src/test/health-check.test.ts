import { describe, it, expect } from "vitest";
import { app } from "../index";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("returns correct response shape", async () => {
    const res = await app.request("/api/health");
    const data = await res.json() as Record<string, unknown>;
    expect(data.status).toBe("ok");
    expect(data.service).toBe("api");
    expect(typeof data.timestamp).toBe("string");
  });
});

describe("GET /api/ping", () => {
  it("returns 200 with pong message", async () => {
    const res = await app.request("/api/ping");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json() as Record<string, unknown>;
    expect(data.message).toBe("pong");
  });
});
