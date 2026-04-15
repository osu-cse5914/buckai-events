export const EVENT_TYPES = ["EVENT", "GIG"] as const;
export const EVENT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export const EVENT_SOURCES = ["USER", "OSU_API", "TICKETMASTER"] as const;
export const BROWSE_STATUS_MODES = [
  "ACTIVE",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "ALL",
] as const;
export const BROWSE_SORTS = ["START_ASC", "START_DESC"] as const;

export type BrowseStatusMode = (typeof BROWSE_STATUS_MODES)[number];
export type BrowseSort = (typeof BROWSE_SORTS)[number];

export type BrowseFiltersState = {
  statusMode: BrowseStatusMode;
  source: string;
  sort: BrowseSort;
};

export type BrowseRouteSearch = {
  statusMode?: BrowseStatusMode;
  source?: (typeof EVENT_SOURCES)[number];
  sort?: BrowseSort;
  selected?: string;
};

export type FeaturedRouteSearch = {
  type?: (typeof EVENT_TYPES)[number];
};

export type SearchRouteSearch = {
  q?: string;
  type?: (typeof EVENT_TYPES)[number];
  category?: string;
  tag?: string;
  page?: number;
};

export type AiRouteSearch = {
  conversationId?: string;
  prompt?: string;
};

export type CreateEventRouteSearch = {
  type?: (typeof EVENT_TYPES)[number];
};

export type EventDetailRouteSearch = SearchRouteSearch & {
  returnTo?: "search" | "browse" | "featured";
  browseType?: (typeof EVENT_TYPES)[number];
  statusMode?: BrowseStatusMode;
  source?: (typeof EVENT_SOURCES)[number];
  sort?: BrowseSort;
  selected?: string;
  previousEventId?: string;
  previousEventTitle?: string;
};

function normalizeTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSearchTagValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/^#+/, "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSearchCategoryValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSearchTypeValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "event":
    case "events":
      return "EVENT" as const;
    case "gig":
    case "gigs":
      return "GIG" as const;
    default:
      return undefined;
  }
}

export function parseSearchInputValue(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return {
      query: undefined,
      type: undefined,
      category: undefined,
      tag: undefined,
    };
  }

  const filterMatches = Array.from(
    normalizedValue.matchAll(/(?:^|\s)(tag|type|category):\s*([^\s]+)/gi),
  );
  const tag = normalizeSearchTagValue(
    filterMatches
      .filter((match) => match[1]?.toLowerCase() === "tag")
      .at(-1)?.[2],
  );
  const type = normalizeSearchTypeValue(
    filterMatches
      .filter((match) => match[1]?.toLowerCase() === "type")
      .at(-1)?.[2],
  );
  const category = normalizeSearchCategoryValue(
    filterMatches
      .filter((match) => match[1]?.toLowerCase() === "category")
      .at(-1)?.[2],
  );
  const query = normalizedValue
    .replace(/(?:^|\s)(tag|type|category):\s*([^\s]+)/gi, " ")
    .trim();

  return {
    query: query || undefined,
    type,
    category,
    tag,
  };
}

export function buildSearchInputValue({
  query,
  type,
  category,
  tag,
}: {
  query: string;
  type: SearchRouteSearch["type"] | "";
  category: string;
  tag: string;
}) {
  const parts = [query.trim()];
  const normalizedType = normalizeSearchTypeValue(type);
  const normalizedCategory = normalizeSearchCategoryValue(category);
  const normalizedTag = normalizeSearchTagValue(tag);

  if (normalizedType) {
    parts.push(`type:${normalizedType.toLowerCase()}`);
  }
  if (normalizedCategory) {
    parts.push(`category:${normalizedCategory}`);
  }
  if (normalizedTag) {
    parts.push(`tag:${normalizedTag}`);
  }

  return parts.filter(Boolean).join(" ");
}

function normalizeEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return allowed.includes(value as T) ? (value as T) : undefined;
}

function normalizePage(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 1) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : undefined;
}

export function validateBrowseSearch(
  search: Record<string, unknown>,
): BrowseRouteSearch {
  const legacyStatus = normalizeEnumValue(search.status, EVENT_STATUSES);

  return {
    statusMode:
      normalizeEnumValue(search.statusMode, BROWSE_STATUS_MODES) ??
      (legacyStatus as BrowseStatusMode | undefined),
    source: normalizeEnumValue(search.source, EVENT_SOURCES),
    sort: normalizeEnumValue(search.sort, BROWSE_SORTS),
    selected: normalizeTrimmedString(search.selected),
  };
}

export function validateFeaturedSearch(
  search: Record<string, unknown>,
): FeaturedRouteSearch {
  return {
    type: normalizeEnumValue(search.type, EVENT_TYPES),
  };
}

export function validateEventSearch(
  search: Record<string, unknown>,
): SearchRouteSearch {
  const parsedSearchInput = parseSearchInputValue(
    normalizeTrimmedString(search.q) ?? "",
  );

  return {
    q: parsedSearchInput.query,
    type:
      normalizeEnumValue(search.type, EVENT_TYPES) ?? parsedSearchInput.type,
    category:
      normalizeTrimmedString(search.category) ?? parsedSearchInput.category,
    tag: normalizeSearchTagValue(normalizeTrimmedString(search.tag)) ?? parsedSearchInput.tag,
    page: normalizePage(search.page),
  };
}

export function validateAiSearch(
  search: Record<string, unknown>,
): AiRouteSearch {
  return {
    conversationId: normalizeTrimmedString(search.conversationId),
    prompt: normalizeTrimmedString(search.prompt),
  };
}

export function validateCreateEventSearch(
  search: Record<string, unknown>,
): CreateEventRouteSearch {
  return {
    type: normalizeEnumValue(search.type, EVENT_TYPES),
  };
}

export function validateEventDetailSearch(
  search: Record<string, unknown>,
): EventDetailRouteSearch {
  const baseSearch = validateEventSearch(search);
  const browseSearch = validateBrowseSearch(search);

  return {
    ...baseSearch,
    ...browseSearch,
    returnTo:
      search.returnTo === "search"
        ? "search"
        : search.returnTo === "browse"
          ? "browse"
          : search.returnTo === "featured"
            ? "featured"
          : undefined,
    browseType: normalizeEnumValue(search.browseType, EVENT_TYPES),
    previousEventId: normalizeTrimmedString(search.previousEventId),
    previousEventTitle: normalizeTrimmedString(search.previousEventTitle),
  };
}

export function hasStartedEventSearch(search: SearchRouteSearch) {
  return Boolean(search.q || search.type || search.category || search.tag);
}

export function toPageIndex(page: number) {
  return Math.max(page - 1, 0);
}

export function toOptionalPage(pageIndex: number) {
  return pageIndex > 0 ? pageIndex + 1 : undefined;
}

export function defaultBrowseFiltersForType(
  type: (typeof EVENT_TYPES)[number],
): BrowseFiltersState {
  return {
    statusMode: type === "GIG" ? "OPEN" : "ACTIVE",
    source: "",
    sort: "START_ASC",
  };
}
