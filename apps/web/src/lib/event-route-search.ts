export const EVENT_TYPES = ["EVENT", "GIG"] as const;
export const EVENT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export const EVENT_SOURCES = ["USER", "OSU_API", "TICKETMASTER"] as const;

export type BrowseRouteSearch = {
  status?: (typeof EVENT_STATUSES)[number];
  source?: (typeof EVENT_SOURCES)[number];
  category?: string;
  selected?: string;
};

export type SearchRouteSearch = {
  q?: string;
  type?: (typeof EVENT_TYPES)[number];
  category?: string;
  page?: number;
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
  return {
    status: normalizeEnumValue(search.status, EVENT_STATUSES),
    source: normalizeEnumValue(search.source, EVENT_SOURCES),
    category: normalizeTrimmedString(search.category),
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

export function hasStartedEventSearch(search: SearchRouteSearch) {
  return Boolean(search.q || search.type || search.category);
}

export function toPageIndex(page: number) {
  return Math.max(page - 1, 0);
}

export function toOptionalPage(pageIndex: number) {
  return pageIndex > 0 ? pageIndex + 1 : undefined;
}
