import type { EventRecord } from "./types";

const typeLabels: Record<string, string> = {
  EVENT: "Event",
  GIG: "Gig",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const sourceLabels: Record<string, string> = {
  USER: "User",
  OSU_API: "OSU",
  TICKETMASTER: "Ticketmaster",
};

export function formatTypeLabel(type: string) {
  return typeLabels[type] ?? type;
}

export function formatStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}

export function formatSourceLabel(source: string) {
  return sourceLabels[source] ?? "External";
}

export function formatAttribution(event: Pick<EventRecord, "source" | "creator">) {
  if (event.source === "USER") {
    return event.creator?.displayName ?? event.creator?.email ?? "User";
  }

  return formatSourceLabel(event.source);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateLong(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCompensation(event: Pick<EventRecord, "compensationAmount" | "compensationCurrency" | "compensationType">) {
  if (event.compensationAmount == null) {
    return null;
  }

  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: event.compensationCurrency ?? "USD",
    maximumFractionDigits: Number.isInteger(event.compensationAmount) ? 0 : 2,
  }).format(event.compensationAmount);

  return event.compensationType === "HOURLY" ? `${amount}/hr` : amount;
}
