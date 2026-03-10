import { hc } from "hono/client";
import type { AppType } from "@social-osu/api";

/**
 * Typed Hono RPC client for the Social OSU API.
 *
 * The base URL is "/" because:
 * - In dev: Vite proxies /api/* to the backend at :3001 (see vite.config.ts)
 * - In production: frontend and API are served from the same CF Worker origin
 *
 * Usage examples:
 *   const res = await api.api.health.$get();
 *   const data = await res.json();   // typed: { status: string, service: string, timestamp: string }
 *
 *   const res = await api.api.v1.users.me.$get();
 *   const res = await api.api.v1.events.$post({ json: { title: "Hack Night", ... } });
 *
 * Route path segments map to object keys:
 *   GET /api/v1/events  →  api.api.v1.events.$get()
 */
export const api = hc<AppType>("/");
