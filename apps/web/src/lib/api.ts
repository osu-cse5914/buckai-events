import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
} from "react";
import { hc } from "hono/client";
import type { AppType } from "@social-osu/api";

export function createApiClient(getToken: () => Promise<string | null>) {
  return hc<AppType>("/", {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getToken();
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  return createElement(ApiClientContext.Provider, { value: client }, children);
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("ApiClientProvider is missing from the app tree");
  }

  return client;
}
