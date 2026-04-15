import type {
  Application,
  Collection,
  CollectionItem,
  Conversation,
  Event,
  EventPipelineJob,
  EventPipelineRun,
  Follow,
  Interaction,
  Message,
  User,
} from "@prisma/client";
import { mergeFixture, type FixtureOverrides } from "./utils";

type CreatorSummary = {
  id: string;
  displayName: string | null;
  email: string;
};

type ApplicantSummary = {
  id: string;
  displayName: string | null;
  email: string;
};

type GigSummary = {
  id: string;
  title: string;
  status: string;
  startAt: Date;
  locationName: string;
};

type EventEmbeddingSummary = {
  id: string;
  eventId: string;
  textHash: string;
};

type FeedEventSummary = {
  id: string;
  title: string;
  source: string;
  type: string;
  status: string;
};

export type AuthUser = Pick<User, "id" | "clerkId" | "email">;
export type EventWithCreator = Event & {
  creator: CreatorSummary | null;
};
export type EventWithCreatorAndInteractions = EventWithCreator & {
  interactions: Array<{ id: string }>;
};
export type EventWithEmbedding = Event & {
  embedding: EventEmbeddingSummary | null;
};
export type ApplicationWithApplicant = Application & {
  applicant: ApplicantSummary;
};
export type ApplicationWithGig = Application & {
  gig: GigSummary;
};
export type CollectionWithCount = Collection & {
  _count: {
    items: number;
  };
};
export type CollectionItemWithEvent = CollectionItem & {
  event: EventWithCreator;
};
export type EventPipelineRunWithEvent = EventPipelineRun & {
  event: EventWithEmbedding;
};
export type EventPipelineJobWithRuns = EventPipelineJob & {
  runs: EventPipelineRunWithEvent[];
};
export type SocialFeedItem = {
  event: FeedEventSummary;
  action: "created" | "saved";
  actor: {
    id: string;
    displayName: string | null;
  };
  actionAt: string;
};

export { type FixtureOverrides } from "./utils";

export function buildUser(overrides: FixtureOverrides<User> = {}): User {
  return mergeFixture<User>(
    {
      id: "user_1",
      clerkId: "clerk_abc123",
      email: "student@osu.edu",
      role: "USER",
      displayName: "Brutus",
      major: "Computer Science",
      gradYear: 2026,
      interests: ["music", "sports"],
      followerCount: 0,
      followingCount: 0,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    },
    overrides,
  );
}

export function buildAuthUser(overrides: FixtureOverrides<AuthUser> = {}): AuthUser {
  const user = buildUser(overrides);
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
  };
}

export function buildInteraction(overrides: FixtureOverrides<Interaction> = {}): Interaction {
  return mergeFixture<Interaction>(
    {
      id: "int_1",
      userId: "user_1",
      eventId: "evt_1",
      action: "VIEW",
      createdAt: new Date("2026-03-31T15:00:00.000Z"),
    },
    overrides,
  );
}

export function buildEvent(overrides: FixtureOverrides<Event> = {}): Event {
  return mergeFixture<Event>(
    {
      id: "evt_1",
      title: "Hackathon",
      description: "A 24-hour build sprint",
      summary: null,
      type: "EVENT",
      source: "USER",
      externalId: null,
      sourceHash: null,
      category: "tech",
      tags: [],
      imageUrl: null,
      ticketUrl: null,
      externalUrl: null,
      locationName: "Ohio Union",
      locationLatitude: null,
      locationLongitude: null,
      startAt: new Date("2026-04-01T09:00:00.000Z"),
      endAt: null,
      compensationAmount: null,
      compensationCurrency: "USD",
      compensationType: null,
      status: "OPEN",
      creatorId: "user_1",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    },
    overrides,
  );
}

export function buildEventWithCreator(
  overrides: FixtureOverrides<EventWithCreator> = {},
): EventWithCreator {
  return mergeFixture<EventWithCreator>(
    {
      ...buildEvent(),
      creator: {
        id: "user_1",
        displayName: "Brutus",
        email: "student@osu.edu",
      },
    },
    overrides,
  );
}

export function buildEventWithCreatorAndInteractions(
  overrides: FixtureOverrides<EventWithCreatorAndInteractions> = {},
): EventWithCreatorAndInteractions {
  return mergeFixture<EventWithCreatorAndInteractions>(
    {
      ...buildEventWithCreator(),
      interactions: [],
    },
    overrides,
  );
}

export function buildEventWithEmbedding(
  overrides: FixtureOverrides<EventWithEmbedding> = {},
): EventWithEmbedding {
  return mergeFixture<EventWithEmbedding>(
    {
      ...buildEvent(),
      embedding: null,
    },
    overrides,
  );
}

export function buildApplication(overrides: FixtureOverrides<Application> = {}): Application {
  return mergeFixture<Application>(
    {
      id: "app_1",
      gigId: "gig_1",
      applicantId: "user_1",
      message: "I'm interested",
      status: "PENDING",
      createdAt: new Date("2026-03-01T12:00:00.000Z"),
      updatedAt: new Date("2026-03-01T12:00:00.000Z"),
    },
    overrides,
  );
}

export function buildApplicationWithApplicant(
  overrides: FixtureOverrides<ApplicationWithApplicant> = {},
): ApplicationWithApplicant {
  return mergeFixture<ApplicationWithApplicant>(
    {
      ...buildApplication(),
      applicant: {
        id: "user_1",
        displayName: "Brutus",
        email: "student@osu.edu",
      },
    },
    overrides,
  );
}

export function buildApplicationWithGig(
  overrides: FixtureOverrides<ApplicationWithGig> = {},
): ApplicationWithGig {
  return mergeFixture<ApplicationWithGig>(
    {
      ...buildApplication(),
      gig: {
        id: "gig_1",
        title: "Campus Tutor",
        status: "OPEN",
        startAt: new Date("2026-03-20T14:00:00.000Z"),
        locationName: "Thompson Library",
      },
    },
    overrides,
  );
}

export function buildCollection(overrides: FixtureOverrides<Collection> = {}): Collection {
  return mergeFixture<Collection>(
    {
      id: "col_1",
      userId: "user_1",
      name: "Music Events",
      visibility: "PRIVATE",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    },
    overrides,
  );
}

export function buildCollectionWithCount(
  overrides: FixtureOverrides<CollectionWithCount> = {},
): CollectionWithCount {
  return mergeFixture<CollectionWithCount>(
    {
      ...buildCollection(),
      _count: {
        items: 0,
      },
    },
    overrides,
  );
}

export function buildCollectionItem(
  overrides: FixtureOverrides<CollectionItem> = {},
): CollectionItem {
  return mergeFixture<CollectionItem>(
    {
      id: "item_1",
      collectionId: "col_1",
      eventId: "evt_1",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    },
    overrides,
  );
}

export function buildCollectionItemWithEvent(
  overrides: FixtureOverrides<CollectionItemWithEvent> = {},
): CollectionItemWithEvent {
  return mergeFixture<CollectionItemWithEvent>(
    {
      ...buildCollectionItem(),
      event: buildEventWithCreator(),
    },
    overrides,
  );
}

export function buildConversation(overrides: FixtureOverrides<Conversation> = {}): Conversation {
  return mergeFixture<Conversation>(
    {
      id: "conv_1",
      userId: "user_1",
      title: null,
      pendingAction: null,
      pendingActionCreatedAt: null,
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      updatedAt: new Date("2026-04-01T11:00:00.000Z"),
    },
    overrides,
  );
}

export function buildMessage(overrides: FixtureOverrides<Message> = {}): Message {
  return mergeFixture<Message>(
    {
      id: "msg_1",
      conversationId: "conv_1",
      role: "USER",
      content: "hello",
      parts: null,
      createdAt: new Date("2026-04-01T11:00:00.000Z"),
    },
    overrides,
  );
}

export function buildFollow(overrides: FixtureOverrides<Follow> = {}): Follow {
  return mergeFixture<Follow>(
    {
      id: "follow_1",
      followerId: "user_1",
      followeeId: "user_2",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    },
    overrides,
  );
}

export function buildEventPipelineRun(
  overrides: FixtureOverrides<EventPipelineRunWithEvent> = {},
): EventPipelineRunWithEvent {
  return mergeFixture<EventPipelineRunWithEvent>(
    {
      id: "run_1",
      jobId: "job_1",
      eventId: "evt_1",
      stage: "EMBEDDING",
      status: "QUEUED",
      textHash: null,
      error: null,
      createdAt: new Date("2026-03-31T12:00:00.000Z"),
      updatedAt: new Date("2026-03-31T12:00:00.000Z"),
      startedAt: null,
      finishedAt: null,
      event: buildEventWithEmbedding(),
    },
    overrides,
  );
}

export function buildEventPipelineJob(
  overrides: FixtureOverrides<EventPipelineJobWithRuns> = {},
): EventPipelineJobWithRuns {
  return mergeFixture<EventPipelineJobWithRuns>(
    {
      id: "job_1",
      trigger: "EVENT_CREATE",
      status: "QUEUED",
      stages: ["TAGGING", "EMBEDDING"],
      error: null,
      requestedByUserId: "user_1",
      createdAt: new Date("2026-03-31T12:00:00.000Z"),
      updatedAt: new Date("2026-03-31T12:00:00.000Z"),
      startedAt: null,
      finishedAt: null,
      runs: [],
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
        displayName: "User B",
      },
      actionAt: "2026-03-01T12:00:00.000Z",
    },
    overrides,
  );
}
