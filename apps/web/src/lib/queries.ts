import { queryOptions } from "@tanstack/react-query";
import type { ApiClient } from "./api";

export type CurrentUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  displayName: string | null;
  major: string | null;
  gradYear: number | null;
  interests: string[];
  createdAt: string;
  updatedAt: string;
  followerCount: number;
  followingCount: number;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
  status: string;
  category: string | null;
  tags: string[];
  imageUrl: string | null;
  ticketUrl: string | null;
  externalUrl?: string | null;
  locationName: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  startAt: string;
  endAt: string | null;
  compensationAmount: number | null;
  compensationCurrency: string | null;
  compensationType: string | null;
  summary: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

export type ApplicationSummary = {
  id: string;
  message: string | null;
  status: string;
};

export type GigApplication = ApplicationSummary & {
  applicant: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type MyApplication = ApplicationSummary & {
  gig: {
    id: string;
    title: string;
    status: string;
    startAt: string;
    locationName: string;
  };
};

export type OwnedCollectionSummary = {
  id: string;
  userId: string;
  name: string;
  visibility: "PRIVATE" | "PUBLIC";
  createdAt: string;
  updatedAt: string;
  _count: {
    items: number;
  };
};

export const PAGE_SIZE = 12;

export type EventListItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
  status: string;
  category: string | null;
  tags: string[];
  imageUrl: string | null;
  ticketUrl: string | null;
  locationName: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  startAt: string;
  endAt: string | null;
  compensationAmount: number | null;
  compensationCurrency: string | null;
  compensationType: string | null;
  summary: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

export type EventsResponse = {
  data: EventListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type RecommendationRankingMode =
  | "PERSONALIZED"
  | "POPULARITY_FALLBACK";

export type RecommendationsResponse = {
  items: EventListItem[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    rankingMode: RecommendationRankingMode;
  };
};

export type EventListFilters = {
  search?: string;
  type?: string;
  status?: string;
  statusMode?: string;
  source?: string;
  category?: string;
  sort?: string;
  userId?: string;
};

export const queryKeys = {
  profile: ["profile"] as const,
  event: (eventId: string) => ["event", eventId] as const,
  eventsList: (filters: EventListFilters, page: number, pageSize = PAGE_SIZE) =>
    ["events", filters, page, pageSize] as const,
  infiniteEventsList: (filters: EventListFilters, pageSize = PAGE_SIZE) =>
    ["events", "infinite", filters, pageSize] as const,
  collections: ["collections"] as const,
  recommendationsFeed: (type: string) => ["recommendations", type] as const,
  myApplications: ["my-applications"] as const,
  gigApplications: (eventId: string) => ["gig-applications", eventId] as const,
  gigApplicationStatus: (eventId: string) =>
    ["gig", eventId, "applications", "me"] as const,
};

export function currentUserQueryOptions(api: ApiClient) {
  return queryOptions<CurrentUser>({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const res = await api.api.v1.users.me.$get();
      if (!res.ok) {
        throw new Error("Failed to load profile");
      }
      return res.json() as Promise<CurrentUser>;
    },
  });
}

export function ownedCollectionsQueryOptions(api: ApiClient) {
  return queryOptions<OwnedCollectionSummary[]>({
    queryKey: queryKeys.collections,
    queryFn: async () => {
      const res = await api.api.v1.collections.$get();
      if (!res.ok) {
        throw new Error("Failed to load collections");
      }
      return res.json() as Promise<OwnedCollectionSummary[]>;
    },
  });
}

export function eventDetailQueryOptions(api: ApiClient, eventId: string) {
  return queryOptions<EventRecord | null>({
    queryKey: queryKeys.event(eventId),
    queryFn: async () => {
      const res = await api.api.v1.events[":id"].$get({
        param: { id: eventId },
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to load event");
      }
      return res.json() as Promise<EventRecord>;
    },
  });
}

export function eventsListQueryOptions(
  api: ApiClient,
  filters: EventListFilters,
  page: number,
  pageSize = PAGE_SIZE,
) {
  return queryOptions<EventsResponse>({
    queryKey: queryKeys.eventsList(filters, page, pageSize),
    queryFn: () => fetchEventsList(api, filters, page, pageSize),
  });
}

export async function fetchEventsList(
  api: ApiClient,
  filters: EventListFilters,
  page: number,
  pageSize = PAGE_SIZE,
) {
  const query: Record<string, string> = {
    limit: String(pageSize),
    offset: String(page * pageSize),
  };

  if (filters.search) query.search = filters.search;
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.statusMode) query.statusMode = filters.statusMode;
  if (filters.source) query.source = filters.source;
  if (filters.category) query.category = filters.category;
  if (filters.sort) query.sort = filters.sort;
  if (filters.userId) query.user = filters.userId;

  const response = await api.api.v1.events.$get({ query });
  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }
  return response.json() as Promise<EventsResponse>;
}

export async function fetchRecommendationsPage(
  api: ApiClient,
  {
    type,
    limit = PAGE_SIZE,
    offset = 0,
  }: {
    type?: string;
    limit?: number;
    offset?: number;
  },
) {
  const query: Record<string, string> = {
    limit: String(limit),
    offset: String(offset),
  };

  if (type) {
    query.type = type;
  }

  const response = await api.api.v1.recommendations.$get({ query });
  if (!response.ok) {
    throw new Error("Failed to fetch recommendations");
  }

  return response.json() as Promise<RecommendationsResponse>;
}

export function myApplicationsQueryOptions(
  api: ApiClient,
  limit = 20,
  offset = 0,
) {
  return queryOptions<PaginatedResponse<MyApplication>>({
    queryKey: queryKeys.myApplications,
    queryFn: async () => {
      const res = await api.api.v1.users.me.applications.$get({
        query: {
          limit: String(limit),
          offset: String(offset),
        },
      });
      if (!res.ok) {
        throw new Error("Failed to load applications");
      }
      return res.json() as Promise<PaginatedResponse<MyApplication>>;
    },
  });
}

export function currentGigApplicationQueryOptions(
  api: ApiClient,
  eventId: string,
) {
  return queryOptions<ApplicationSummary | null>({
    queryKey: queryKeys.gigApplicationStatus(eventId),
    queryFn: async () => {
      const res = await api.api.v1.users.me.applications.$get({
        query: {
          limit: "100",
          offset: "0",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to load application status");
      }

      const data = (await res.json()) as PaginatedResponse<MyApplication>;
      const match = data.data.find((application) => application.gig.id === eventId);

      return match
        ? {
            id: match.id,
            message: match.message,
            status: match.status,
          }
        : null;
    },
  });
}

export function gigApplicationsQueryOptions(api: ApiClient, eventId: string) {
  return queryOptions<PaginatedResponse<GigApplication>>({
    queryKey: queryKeys.gigApplications(eventId),
    queryFn: async () => {
      const res = await api.api.v1.gigs[":gigId"].applications.$get({
        param: { gigId: eventId },
        query: {},
      });
      if (!res.ok) {
        throw new Error("Failed to load applications");
      }
      return res.json() as Promise<PaginatedResponse<GigApplication>>;
    },
  });
}
