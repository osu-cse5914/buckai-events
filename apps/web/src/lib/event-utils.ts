export const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  COMPLETED:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TYPE_STYLES: Record<string, string> = {
  EVENT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  GIG: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const TYPE_LABELS: Record<string, string> = {
  EVENT: "Event",
  GIG: "Gig",
};

export const APPLICATION_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  ACCEPTED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

const SOURCE_LABELS: Record<string, string> = {
  USER: "User",
  OSU_API: "OSU",
  TICKETMASTER: "Ticketmaster",
};

type EventAttributionInput = {
  source: string;
  creator?: {
    displayName: string | null;
    email: string;
  } | null;
};

export function formatEventAttribution(event: EventAttributionInput) {
  if (event.source === "USER") {
    return event.creator?.displayName ?? event.creator?.email ?? SOURCE_LABELS.USER;
  }

  return SOURCE_LABELS[event.source] ?? "External";
}

export function formatEventTypeLabel(type: string) {
  return TYPE_LABELS[type] ?? type;
}

export function formatEventSourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? "External";
}

export function formatEventCategoryLabel(category: string | null | undefined) {
  if (!category) {
    return null;
  }

  return category
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((word) =>
      word.length > 0 ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word,
    )
    .join(" ");
}

export function isEventEnded(status: string) {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function buildEventMetaLine({
  type,
  source,
  category,
  status,
}: {
  type: string;
  source: string;
  category?: string | null;
  status?: string;
}) {
  const parts = [formatEventTypeLabel(type), formatEventSourceLabel(source)];
  const categoryLabel = formatEventCategoryLabel(category);

  if (categoryLabel) {
    parts.push(categoryLabel);
  }

  if (status && isEventEnded(status)) {
    parts.push("Ended");
  }

  return parts.join(" · ");
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateLong(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function browsePathForEventType(type?: string): "/events" | "/gigs" {
  return type === "GIG" ? "/gigs" : "/events";
}
