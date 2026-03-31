import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
} from "lucide-react";
import { useApiClient } from "@/lib/api";
import {
  eventsListQueryOptions,
  PAGE_SIZE,
  type EventListFilters,
  type EventListItem,
  type EventsResponse,
} from "@/lib/queries";
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

export function useEventsQuery(
  filters: EventListFilters,
  page: number,
  enabled = true,
) {
  const api = useApiClient();

  return useQuery<EventsResponse>({
    ...eventsListQueryOptions(api, filters, page),
    enabled,
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

export function EventsGrid({
  events,
  showTypeBadge = true,
}: {
  events: EventListItem[];
  showTypeBadge?: boolean;
}) {
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
                {showTypeBadge ? (
                  <Badge
                    variant="secondary"
                    className={TYPE_STYLES[event.type] ?? ""}
                  >
                    {event.type}
                  </Badge>
                ) : null}
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
