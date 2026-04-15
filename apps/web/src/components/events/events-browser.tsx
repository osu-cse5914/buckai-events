import type { MouseEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from "lucide-react";
import { useApiClient } from "@/lib/api";
import {
  fetchEventsList,
  eventsListQueryOptions,
  PAGE_SIZE,
  queryKeys,
  type EventListFilters,
  type EventListItem,
  type EventsResponse,
  searchResultsQueryOptions,
  type SearchResultsFilters,
} from "@/lib/queries";
import { buildEventMetaLine, formatDate } from "@/lib/event-utils";
import type { EventDetailRouteSearch } from "@/lib/event-route-search";
import { SaveToCollectionButton } from "@/components/collections/save-to-collection-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function useEventsQuery(
  filters: EventListFilters,
  page: number,
  enabled = true,
  pageSize = PAGE_SIZE,
) {
  const api = useApiClient();

  return useQuery<EventsResponse>({
    ...eventsListQueryOptions(api, filters, page, pageSize),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSearchResultsQuery(
  filters: SearchResultsFilters,
  page: number,
  enabled = true,
  pageSize = PAGE_SIZE,
) {
  const api = useApiClient();

  return useQuery<EventsResponse>({
    ...searchResultsQueryOptions(api, filters, page, pageSize),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useInfiniteEventsQuery(
  filters: EventListFilters,
  enabled = true,
  pageSize = PAGE_SIZE,
) {
  const api = useApiClient();

  return useInfiniteQuery<EventsResponse>({
    queryKey: queryKeys.infiniteEventsList(filters, pageSize),
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchEventsList(api, filters, pageParam as number, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, currentPage) => count + currentPage.data.length, 0);

      return loaded < lastPage.pagination.total ? allPages.length : undefined;
    },
  });
}

export function EventsListSkeleton({
  rows = 6,
  showHeader = true,
  showPagination = false,
  framed = true,
  className,
}: {
  rows?: number;
  showHeader?: boolean;
  showPagination?: boolean;
  framed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(framed ? "overflow-hidden rounded-2xl border bg-background" : "", className)}
    >
      {showHeader ? (
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      ) : null}

      <div className="divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-5 w-4/5" />
                <div className="mt-3 flex flex-wrap gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="mt-3 h-4 w-36" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showPagination ? (
        <div className="border-t px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EventsBrowseSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-background lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
      <div className="border-b lg:flex lg:min-h-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>

          <Skeleton className="mt-3 h-10 w-full" />
        </div>

        <div className="lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border-b px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-4/5" />
                </div>

                <div className="flex shrink-0 gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>

              <Skeleton className="mt-3 h-4 w-36" />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden lg:block lg:min-h-0 lg:overflow-hidden">
        <div className="px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <Skeleton className="mt-3 h-10 w-3/4" />
          <Skeleton className="mt-2 h-4 w-24" />
          <Skeleton className="mt-3 h-4 w-full" />

          <div className="my-6 h-px bg-border" />

          <div className="space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-36" />
          </div>

          <div className="my-6 h-px bg-border" />

          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventsErrorState({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        "mt-8 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive",
        className,
      )}
    >
      {message}
    </div>
  );
}

export function EventsEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-8 flex flex-col items-center gap-2 px-2 py-4 text-center", className)}>
      <p className="text-lg font-medium">{title}</p>
      <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function EventsList({
  events,
  selectedEventId,
  showSaveAction = true,
  detailSearch,
  getItemAriaLabel,
  renderRightAccessory,
  onSelectEvent,
}: {
  events: EventListItem[];
  selectedEventId?: string;
  showSaveAction?: boolean;
  detailSearch?: EventDetailRouteSearch;
  getItemAriaLabel?: (event: EventListItem) => string;
  renderRightAccessory?: (event: EventListItem) => ReactNode;
  onSelectEvent?: (eventId: string) => void;
}) {
  return (
    <div className="divide-y">
      {events.map((event) => {
        const isSelected = selectedEventId === event.id;

        return (
          <article
            key={event.id}
            aria-label={getItemAriaLabel?.(event) ?? `${event.title} listing`}
            className={cn(
              "border-l-2 border-transparent transition-colors hover:bg-muted/30",
              isSelected ? "border-l-primary bg-muted/30" : "",
            )}
          >
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <Link
                to="/events/$eventId"
                params={{ eventId: event.id }}
                search={detailSearch as never}
                onClick={(clickEvent) => {
                  if (!onSelectEvent) {
                    return;
                  }

                  if (!shouldKeepSplitViewSelection(clickEvent)) {
                    return;
                  }

                  clickEvent.preventDefault();
                  onSelectEvent(event.id);
                }}
                aria-current={isSelected ? "page" : undefined}
                className="min-w-0 flex-1"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm text-muted-foreground">
                    {buildEventMetaLine({
                      type: event.type,
                      source: event.source,
                      category: event.category,
                      status: event.status,
                    })}
                  </p>
                  <h2 className="line-clamp-2 text-base font-semibold leading-tight">
                    {event.title}
                  </h2>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {event.type === "GIG" && event.compensationAmount != null ? (
                    <span className="font-medium text-foreground">
                      ${event.compensationAmount}
                      {event.compensationType === "HOURLY" ? "/hr" : " fixed"}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    <span className="truncate">{event.locationName}</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5 shrink-0" />
                  <span>{formatDate(event.startAt)}</span>
                </div>
              </Link>

              <div className="flex shrink-0 items-start gap-2">
                {renderRightAccessory ? renderRightAccessory(event) : null}
                {showSaveAction ? <SaveToCollectionButton eventId={event.id} /> : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function EventsPagination({
  page,
  total,
  onPageChange,
  className,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("mt-8 flex items-center justify-between", className)}>
      <p className="text-sm text-muted-foreground">
        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
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

function shouldKeepSplitViewSelection(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return false;
  }

  return window.matchMedia("(min-width: 1024px)").matches;
}
