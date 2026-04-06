import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
} from "react";
import { API_BASE_URL } from "./env";
import type {
  CurrentUser,
  EventRecord,
  EventsResponse,
  ProfileUpdateInput,
  RecommendationSectionResponse,
  RecommendationsResponse,
} from "./types";

type QueryValue = string | number | undefined;

type ApiClientOptions = {
  getToken: () => Promise<string | null>;
  baseUrl?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function toQueryString(query?: Record<string, QueryValue>) {
  if (!query) {
    return "";
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const result = searchParams.toString();
  return result ? `?${result}` : "";
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? fallback;
  } catch {
    return fallback;
  }
}

export function createApiClient({
  getToken,
  baseUrl = API_BASE_URL,
}: ApiClientOptions) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    options: {
      method?: "GET" | "PATCH";
      query?: Record<string, QueryValue>;
      body?: unknown;
    } = {},
  ) {
    const token = await getToken();
    const headers = new Headers({
      Accept: "application/json",
    });

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(
      `${normalizedBaseUrl}${path}${toQueryString(options.query)}`,
      {
        method: options.method ?? "GET",
        headers,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
      },
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        await readErrorMessage(response, "Request failed"),
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    getCurrentUser() {
      return request<CurrentUser>("/api/v1/users/me");
    },
    updateCurrentUser(input: ProfileUpdateInput) {
      return request<CurrentUser>("/api/v1/users/me", {
        method: "PATCH",
        body: input,
      });
    },
    listRecommendations(type?: "EVENT" | "GIG", limit = 12, offset = 0) {
      return request<RecommendationsResponse>("/api/v1/recommendations", {
        query: { type, limit, offset },
      });
    },
    listPopularRecommendations(type?: "EVENT" | "GIG", limit = 3) {
      return request<RecommendationSectionResponse>(
        "/api/v1/recommendations/popular",
        {
          query: { type, limit, offset: 0 },
        },
      );
    },
    listUpcomingRecommendations(type?: "EVENT" | "GIG", limit = 3) {
      return request<RecommendationSectionResponse>(
        "/api/v1/recommendations/upcoming",
        {
          query: { type, limit, offset: 0 },
        },
      );
    },
    listEvents(input: {
      type?: "EVENT" | "GIG";
      statusMode?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) {
      return request<EventsResponse>("/api/v1/events", {
        query: {
          type: input.type,
          statusMode: input.statusMode,
          sort: input.sort,
          limit: input.limit,
          offset: input.offset,
        },
      });
    },
    async getEvent(eventId: string) {
      try {
        return await request<EventRecord>(`/api/v1/events/${eventId}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
  };
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

export function useApiClient() {
  const client = useContext(ApiClientContext);

  if (!client) {
    throw new Error("ApiClientProvider is missing from the tree");
  }

  return client;
}
