import type {
  CollectionDetail,
  ConversationMessage,
  ConversationRecord,
  CurrentUser,
  EventRecord,
  GigApplication,
  MyApplication,
  OwnedCollectionSummary,
  PaginatedResponse,
  RecommendationSectionResponse,
  RecommendationsResponse,
  SocialFeedItem,
} from "@/lib/queries";
import { mergeFixture, type FixtureOverrides } from "./utils";

export { type FixtureOverrides } from "./utils";

export type CollectionDetailItem = CollectionDetail["items"][number];

export function buildCurrentUser(
  overrides: FixtureOverrides<CurrentUser> = {},
): CurrentUser {
  return mergeFixture<CurrentUser>(
    {
      id: "user_1",
      email: "student@osu.edu",
      role: "USER",
      displayName: "Brutus",
      major: "Computer Science",
      gradYear: 2026,
      interests: ["music", "sports"],
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      followerCount: 0,
      followingCount: 0,
    },
    overrides,
  );
}

export function buildEventRecord(
  overrides: FixtureOverrides<EventRecord> = {},
): EventRecord {
  return mergeFixture<EventRecord>(
    {
      id: "evt_1",
      title: "Hackathon",
      description: "A 24-hour build sprint",
      type: "EVENT",
      source: "USER",
      status: "OPEN",
      category: "tech",
      tags: [],
      imageUrl: null,
      ticketUrl: null,
      externalUrl: null,
      locationName: "Ohio Union",
      locationLatitude: null,
      locationLongitude: null,
      startAt: "2026-04-01T09:00:00.000Z",
      endAt: null,
      compensationAmount: null,
      compensationCurrency: "USD",
      compensationType: null,
      summary: null,
      creatorId: "user_1",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      creator: {
        id: "user_1",
        displayName: "Brutus",
        email: "student@osu.edu",
      },
    },
    overrides,
  );
}

export function buildGigApplication(
  overrides: FixtureOverrides<GigApplication> = {},
): GigApplication {
  return mergeFixture<GigApplication>(
    {
      id: "app_1",
      message: "I can help",
      status: "PENDING",
      applicant: {
        id: "user_2",
        displayName: "Alice",
        email: "alice@osu.edu",
      },
    },
    overrides,
  );
}

export function buildMyApplication(
  overrides: FixtureOverrides<MyApplication> = {},
): MyApplication {
  return mergeFixture<MyApplication>(
    {
      id: "app_1",
      message: "I can help",
      status: "PENDING",
      gig: {
        id: "gig_1",
        title: "Campus Tutor",
        status: "OPEN",
        startAt: "2026-03-20T14:00:00.000Z",
        locationName: "Thompson Library",
      },
    },
    overrides,
  );
}

export function buildOwnedCollectionSummary(
  overrides: FixtureOverrides<OwnedCollectionSummary> = {},
): OwnedCollectionSummary {
  return mergeFixture<OwnedCollectionSummary>(
    {
      id: "col_1",
      userId: "user_1",
      name: "Music Events",
      visibility: "PRIVATE",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      _count: {
        items: 0,
      },
    },
    overrides,
  );
}

export function buildCollectionDetailItem(
  overrides: FixtureOverrides<CollectionDetailItem> = {},
): CollectionDetailItem {
  return mergeFixture<CollectionDetailItem>(
    {
      id: "item_1",
      collectionId: "col_1",
      eventId: "evt_1",
      event: buildEventRecord(),
    },
    overrides,
  );
}

export function buildCollectionDetail(
  overrides: FixtureOverrides<CollectionDetail> = {},
): CollectionDetail {
  return mergeFixture<CollectionDetail>(
    {
      id: "col_1",
      userId: "user_1",
      name: "Music Events",
      visibility: "PRIVATE",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      items: [],
    },
    overrides,
  );
}

export function buildConversationRecord(
  overrides: FixtureOverrides<ConversationRecord> = {},
): ConversationRecord {
  return mergeFixture<ConversationRecord>(
    {
      id: "conv_1",
      userId: "user_1",
      title: "Free weekend events",
      pendingAction: null,
      pendingActionCreatedAt: null,
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-01T11:00:00.000Z",
    },
    overrides,
  );
}

export function buildConversationMessage(
  overrides: FixtureOverrides<ConversationMessage> = {},
): ConversationMessage {
  return mergeFixture<ConversationMessage>(
    {
      id: "msg_1",
      conversationId: "conv_1",
      role: "USER",
      content: "hello",
      parts: null,
      createdAt: "2026-04-01T11:00:00.000Z",
    },
    overrides,
  );
}

export function buildSocialFeedItem(
  overrides: FixtureOverrides<SocialFeedItem> = {},
): SocialFeedItem {
  return mergeFixture<SocialFeedItem>(
    {
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
      actionAt: "2026-03-01T12:00:00.000Z",
    },
    overrides,
  );
}

export function buildPaginatedResponse<T>(
  data: T[] = [],
  overrides: FixtureOverrides<PaginatedResponse<T>> = {},
): PaginatedResponse<T> {
  return mergeFixture<PaginatedResponse<T>>(
    {
      data,
      pagination: {
        total: data.length,
        limit: 50,
        offset: 0,
      },
    },
    overrides,
  );
}

export function buildRecommendationsResponse(
  items: EventRecord[] = [],
  overrides: FixtureOverrides<RecommendationsResponse> = {},
): RecommendationsResponse {
  return mergeFixture<RecommendationsResponse>(
    {
      items,
      meta: {
        total: items.length,
        limit: 12,
        offset: 0,
        rankingMode: "PERSONALIZED",
      },
    },
    overrides,
  );
}

export function buildRecommendationSectionResponse(
  items: EventRecord[] = [],
  overrides: FixtureOverrides<RecommendationSectionResponse> = {},
): RecommendationSectionResponse {
  return mergeFixture<RecommendationSectionResponse>(
    {
      items,
      meta: {
        total: items.length,
        limit: items.length,
        offset: 0,
      },
    },
    overrides,
  );
}
