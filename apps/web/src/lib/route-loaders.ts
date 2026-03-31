import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "./api";
import {
  currentUserQueryOptions,
  eventDetailQueryOptions,
  eventsListQueryOptions,
  type EventListFilters,
  type EventsResponse,
  type CurrentUser,
  type EventRecord,
} from "./queries";

export type OwnedEventRouteData = {
  access: "ok" | "not-found" | "external" | "forbidden" | "not-gig";
  currentUser: CurrentUser;
  event: EventRecord | null;
};

export async function loadOwnedEventRouteData({
  api,
  queryClient,
  eventId,
  requireGig = false,
}: {
  api: ApiClient;
  queryClient: QueryClient;
  eventId: string;
  requireGig?: boolean;
}): Promise<OwnedEventRouteData> {
  const [currentUser, event] = await Promise.all([
    queryClient.ensureQueryData(currentUserQueryOptions(api)),
    queryClient.ensureQueryData(eventDetailQueryOptions(api, eventId)),
  ]);

  if (!event) {
    return { access: "not-found", currentUser, event: null };
  }

  if (event.source !== "USER") {
    return { access: "external", currentUser, event };
  }

  if (requireGig && event.type !== "GIG") {
    return { access: "not-gig", currentUser, event };
  }

  if (event.creatorId !== currentUser.id) {
    return { access: "forbidden", currentUser, event };
  }

  return { access: "ok", currentUser, event };
}

export async function loadEventsRouteData({
  api,
  queryClient,
  filters,
  page,
  enabled = true,
}: {
  api: ApiClient;
  queryClient: QueryClient;
  filters: EventListFilters;
  page: number;
  enabled?: boolean;
}): Promise<EventsResponse | null> {
  if (!enabled) {
    return null;
  }

  return queryClient.ensureQueryData(eventsListQueryOptions(api, filters, page));
}
