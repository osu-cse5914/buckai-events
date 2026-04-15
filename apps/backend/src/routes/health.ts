import { Hono } from "hono";
import type { AppEnv } from "../lib/types";

export const health = new Hono<AppEnv>().get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  });
});
