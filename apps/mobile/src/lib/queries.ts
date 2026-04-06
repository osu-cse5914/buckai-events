import { queryOptions } from "@tanstack/react-query";
import type { ApiClient } from "./api";
import type {
  CurrentUser,
  EventRecord,
  EventsResponse,
  RecommendationSectionResponse,
  RecommendationsResponse,
} from "./types";

export const PAGE_SIZE = 12;
export const FEATURED_PREVIEW_LIMIT = 3;

export const queryKeys = {
  profile: ["profile"] as const,
  recommended: (type: string, pageSize = PAGE_SIZE) =>
    ["recommended", type, pageSize] as const,
  popular: (type: string) => ["popular", type] as const,
  upcoming: (type: string) => ["upcoming", type] as const,
  catalog: (type: string, pageSize = PAGE_SIZE) =>
    ["catalog", type, pageSize] as const,
  event: (eventId: string) => ["event", eventId] as const,
};

export function currentUserQueryOptions(api: ApiClient) {
  return queryOptions<CurrentUser>({
    queryKey: queryKeys.profile,
    queryFn: () => api.getCurrentUser(),
  });
}

export function eventDetailQueryOptions(api: ApiClient, eventId: string) {
  return queryOptions<EventRecord | null>({
    queryKey: queryKeys.event(eventId),
    queryFn: () => api.getEvent(eventId),
  });
}

export function fetchRecommendationsPage(
  api: ApiClient,
  input: {
    type?: "EVENT" | "GIG";
    limit: number;
    offset: number;
  },
) {
  return api.listRecommendations(input.type, input.limit, input.offset);
}

export function fetchPopularRecommendations(
  api: ApiClient,
  input: {
    type?: "EVENT" | "GIG";
    limit: number;
  },
) {
  return api.listPopularRecommendations(input.type, input.limit);
}

export function fetchUpcomingRecommendations(
  api: ApiClient,
  input: {
    type?: "EVENT" | "GIG";
    limit: number;
  },
) {
  return api.listUpcomingRecommendations(input.type, input.limit);
}

export function fetchCatalogPage(
  api: ApiClient,
  input: {
    type?: "EVENT" | "GIG";
    limit: number;
    offset: number;
  },
) {
  return api.listEvents({
    type: input.type,
    statusMode: "ACTIVE",
    sort: "START_ASC",
    limit: input.limit,
    offset: input.offset,
  });
}

export type FeaturedSectionResponse = RecommendationsResponse | RecommendationSectionResponse;
export type CatalogPageResponse = EventsResponse;
