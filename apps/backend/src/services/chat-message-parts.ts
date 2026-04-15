export type ChatSearchResultItem = {
  id: string;
  title: string | null;
  description: string | null;
  summary: string | null;
  type: string | null;
  category: string | null;
  tags: string[];
  imageUrl: string | null;
  location: {
    name: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  startAt: string | null;
  endAt: string | null;
  compensation: {
    amount: number | null;
    currency: string | null;
    type: string | null;
  } | null;
  similarity?: number;
};

export type SearchResultsMessagePart = {
  type: "search-results";
  toolName: "searchEvents" | "searchGigs";
  total: number;
  items: ChatSearchResultItem[];
};

export type ReplySuggestionsMessagePart = {
  type: "reply-suggestions";
  toolName: "suggestReplies";
  suggestions: string[];
};

export type ChatMessagePart = SearchResultsMessagePart | ReplySuggestionsMessagePart;
