import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_STYLES,
  formatDate,
} from "@/lib/event-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const PAGE_SIZE = 12;

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
  locationName: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  startAt: string;
  endAt: string | null;
  compensationAmount: number | null;
  compensationCurrency: string | null;
  compensationType: string | null;
  summary: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

export type EventsResponse = {
  data: EventListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type EventsQueryFilters = {
  search?: string;
  type?: string;
  status?: string;
  source?: string;
  category?: string;
  userId?: string;
};

export function useEventsQuery(
  filters: EventsQueryFilters,
  page: number,
  enabled = true,
) {
  return useQuery<EventsResponse>({
    queryKey: ["events-browser", filters, page],
    enabled,
    queryFn: async () => {
      const query: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      };

      if (filters.search) query.search = filters.search;
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.source) query.source = filters.source;
      if (filters.category) query.category = filters.category;
      if (filters.userId) query.user = filters.userId;

      const response = await api.api.v1.events.$get({ query });
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      return response.json() as Promise<EventsResponse>;
    },
    placeholderData: keepPreviousData,
  });
}

export function EventsLoadingGrid() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EventsErrorState({ message }: { message: string }) {
  return (
    <div className="mt-8 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

export function EventsEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function EventsGrid({ events }: { events: EventListItem[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Link
          key={event.id}
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="group"
        >
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={TYPE_STYLES[event.type] ?? ""}
                >
                  {event.type}
                </Badge>
                <Badge
                  variant="secondary"
                  className={STATUS_STYLES[event.status] ?? ""}
                >
                  {STATUS_LABELS[event.status] ?? event.status}
                </Badge>
              </div>
              <CardTitle className="mt-2 line-clamp-2 pb-0.5 leading-tight group-hover:underline">
                {event.title}
              </CardTitle>
              {event.category ? (
                <CardDescription className="capitalize">
                  {event.category}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 shrink-0" />
                <span>{formatDate(event.startAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5 shrink-0" />
                <span className="truncate">{event.locationName}</span>
              </div>
              {event.type === "GIG" && event.compensationAmount != null ? (
                <p className="font-medium text-foreground">
                  ${event.compensationAmount}
                  {event.compensationType === "HOURLY" ? "/hr" : " fixed"}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              {event.creator?.displayName ?? "Unknown"}
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function EventsPagination({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-8 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {page * PAGE_SIZE + 1}–
        {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        {Array.from({ length: totalPages }).map((_, index) => (
          <Button
            key={index}
            variant={index === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(index)}
            className="min-w-9"
          >
            {index + 1}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
