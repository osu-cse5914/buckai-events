import { Hono } from "hono";
import type { AppEnv } from "../lib/types";

export const auth = new Hono<AppEnv>()
  .get("/me", (c) => {
    const user = c.get("user");
    return c.json(user);
  });
