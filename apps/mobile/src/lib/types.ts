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
  externalUrl: string | null;
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

export type EventRecord = EventListItem;

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type EventsResponse = PaginatedResponse<EventListItem>;

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

export type RecommendationSectionResponse = {
  items: EventListItem[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type FeaturedFilter = "ALL" | "EVENT" | "GIG";

export type EventTypeFilter = "ALL" | "EVENT" | "GIG";

export type ProfileUpdateInput = {
  displayName: string | null;
  major: string | null;
  gradYear: number | null;
  interests: string[];
};
