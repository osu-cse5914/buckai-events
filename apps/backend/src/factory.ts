import { createFactory } from "hono/factory";
import type { AppEnv } from "./lib/types";

export const appFactory = createFactory<AppEnv>();
