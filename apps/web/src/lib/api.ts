import { hc } from "hono/client";
import type { AppType } from "@social-osu/api";

/**
 * Typed Hono RPC client for the Social OSU API.
 *
 * The base URL is "/" because:
 * - In dev: Vite proxies /api/* to the backend at :3001 (see vite.config.ts)
 * - In production: frontend and API are served from the same CF Worker origin
 *
 * Auth: call setTokenGetter() once with Clerk's getToken function so that
 * all /api/v1/* requests include the Authorization header automatically.
 *
 * Usage examples:
 *   const res = await api.api.health.$get();
 *   const data = await res.json();   // typed: { status: string, service: string, timestamp: string }
 *
 *   const res = await api.api.v1.auth.me.$get();
 *   const res = await api.api.v1.events.$post({ json: { title: "Hack Night", ... } });
 */

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

export const api = hc<AppType>("/", {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = _getToken ? await _getToken() : null;
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  },
});
