import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
} from "react";
import { hc } from "hono/client";
import type { AppType } from "@social-osu/backend";
import { E2E_TEST_AUTH_HEADER } from "./e2e-auth";

type CreateApiClientInput = {
  getToken: () => Promise<string | null>;
  getE2ETestUserId?: () => string | null;
  baseUrl?: string;
};

export function createApiClient(
  getToken: () => Promise<string | null>,
  baseUrl?: string,
): ReturnType<typeof hc<AppType>>;
export function createApiClient(
  input: CreateApiClientInput,
): ReturnType<typeof hc<AppType>>;
export function createApiClient(
  inputOrGetToken: CreateApiClientInput | (() => Promise<string | null>),
  baseUrl = "/",
) {
  const input =
    typeof inputOrGetToken === "function"
      ? { getToken: inputOrGetToken, baseUrl }
      : inputOrGetToken;

  return hc<AppType>(input.baseUrl ?? "/", {
    fetch: async (request: RequestInfo | URL, init?: RequestInit) => {
      const token = await input.getToken();
      const e2eUserId = input.getE2ETestUserId?.();
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      if (e2eUserId) {
        headers.set(E2E_TEST_AUTH_HEADER, e2eUserId);
      }
      return fetch(request, { ...init, headers });
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
