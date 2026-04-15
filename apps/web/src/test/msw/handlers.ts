import { http, HttpResponse } from "msw";
import {
  PAGE_SIZE,
  type CurrentUser,
  type EventListItem,
  type EventsResponse,
  type SocialFeedItem,
} from "@/lib/queries";

export const TEST_API_BASE_URL = "http://localhost";

export function makeCurrentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "user_1",
    email: "brutus@osu.edu",
    role: "USER",
    displayName: "Brutus Buckeye",
    major: "Computer Science",
    gradYear: 2026,
    interests: ["music", "tech"],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    followerCount: 0,
    followingCount: 0,
    ...overrides,
  };
}

export function makeEventListItem(overrides: Partial<EventListItem> = {}): EventListItem {
  return {
    id: "evt_1",
    title: "Hack Night",
    description: "A campus coding session",
    type: "EVENT",
    source: "USER",
    status: "OPEN",
    category: "tech",
    tags: ["coding"],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2026-04-01T18:00:00.000Z",
    endAt: null,
    compensationAmount: null,
    compensationCurrency: "USD",
    compensationType: null,
    summary: null,
    creatorId: "user_2",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    creator: {
      id: "user_2",
      displayName: "Alice",
      email: "alice@osu.edu",
    },
    ...overrides,
  };
}

export function makeEventsResponse(
  items: EventListItem[] = [],
  pagination: Partial<EventsResponse["pagination"]> = {},
): EventsResponse {
  return {
    data: items,
    pagination: {
      total: pagination.total ?? items.length,
      limit: pagination.limit ?? PAGE_SIZE,
      offset: pagination.offset ?? 0,
    },
  };
}

export function makeSocialFeedItem(overrides: Partial<SocialFeedItem> = {}): SocialFeedItem {
  return {
    event: {
      id: "evt_1",
      title: "Hack Night",
      source: "USER",
      type: "EVENT",
      status: "OPEN",
    },
    action: "created",
    actor: {
      id: "user_2",
      displayName: "Alice",
    },
    actionAt: "2026-03-02T18:00:00.000Z",
    ...overrides,
  };
}

export function makeSocialFeedResponse(
  items: SocialFeedItem[] = [],
  pagination: {
    total?: number;
    limit?: number;
    offset?: number;
  } = {},
) {
  return {
    data: items,
    pagination: {
      total: pagination.total ?? items.length,
      limit: pagination.limit ?? PAGE_SIZE,
      offset: pagination.offset ?? 0,
    },
  };
}

export const handlers = [
  http.get(`${TEST_API_BASE_URL}/api/v1/users/me`, () => HttpResponse.json(makeCurrentUser())),
  http.get(`${TEST_API_BASE_URL}/api/v1/events`, () => HttpResponse.json(makeEventsResponse())),
  http.get(`${TEST_API_BASE_URL}/api/v1/events/semantic-search`, () =>
    HttpResponse.json(makeEventsResponse()),
  ),
  http.get(`${TEST_API_BASE_URL}/api/v1/social/feed`, () =>
    HttpResponse.json(makeSocialFeedResponse()),
  ),
];
