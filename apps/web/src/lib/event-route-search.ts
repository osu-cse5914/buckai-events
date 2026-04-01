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

export type SearchRouteSearch = {
  q?: string;
  type?: (typeof EVENT_TYPES)[number];
  category?: string;
  page?: number;
};

export type CreateEventRouteSearch = {
  type?: (typeof EVENT_TYPES)[number];
};

export type EventDetailRouteSearch = SearchRouteSearch & {
  returnTo?: "search";
};

function normalizeTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

export function validateEventSearch(
  search: Record<string, unknown>,
): SearchRouteSearch {
  return {
    q: normalizeTrimmedString(search.q),
    type: normalizeEnumValue(search.type, EVENT_TYPES),
    category: normalizeTrimmedString(search.category),
    page: normalizePage(search.page),
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

  return {
    ...baseSearch,
    returnTo: search.returnTo === "search" ? "search" : undefined,
  };
}

export function hasStartedEventSearch(search: SearchRouteSearch) {
  return Boolean(search.q || search.type || search.category);
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
