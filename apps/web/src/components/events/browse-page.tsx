import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconCircleButton } from "@/components/ui/icon-circle-button";
import { SPLIT_VIEWER_PAGE_WIDTH } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import { defaultBrowseFiltersForType } from "@/lib/event-route-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventDetailSurface } from "@/components/events/event-detail-surface";
import {
  EventsBrowseSkeleton,
  EventsEmptyState,
  EventsErrorState,
  EventsList,
  useInfiniteEventsQuery,
} from "@/components/events/events-browser";

type BrowseFilters = {
  statusMode: string;
  source: string;
  sort: string;
};

export function BrowsePage({
  browseType,
  title,
  filters,
  selectedEventId,
  onFilterChange,
  onClearFilters,
  onClearSelectedEvent,
  onSelectEvent,
}: {
  browseType: "EVENT" | "GIG";
  title: string;
  filters?: BrowseFilters;
  selectedEventId?: string;
  onFilterChange: (key: keyof BrowseFilters, value: string) => void;
  onClearFilters: () => void;
  onClearSelectedEvent: () => void;
  onSelectEvent: (eventId: string) => void;
}) {
  const defaultFilters = defaultBrowseFiltersForType(browseType);
  const resolvedFilters = filters ?? defaultFilters;
  const itemLabel = browseType === "GIG" ? "gigs" : "events";
  const isSoonestFirst = resolvedFilters.sort === "START_ASC";
  const SortIcon = isSoonestFirst
    ? ArrowUpNarrowWideIcon
    : ArrowDownWideNarrowIcon;
  const statusOptions =
    browseType === "GIG"
      ? [
          { value: "OPEN", label: "Open" },
          { value: "IN_PROGRESS", label: "In Progress" },
          { value: "COMPLETED", label: "Completed" },
          { value: "CANCELLED", label: "Cancelled" },
          { value: "ALL", label: "All statuses" },
        ]
      : [
          { value: "ACTIVE", label: "Active" },
          { value: "OPEN", label: "Open" },
          { value: "IN_PROGRESS", label: "In Progress" },
          { value: "COMPLETED", label: "Completed" },
          { value: "CANCELLED", label: "Cancelled" },
          { value: "ALL", label: "All statuses" },
        ];
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteEventsQuery(
    {
      type: browseType,
      statusMode: resolvedFilters.statusMode,
      source: resolvedFilters.source || undefined,
      sort: resolvedFilters.sort,
    },
  );
  const events = useMemo(
    () => {
      const uniqueEvents = [];
      const seenEventIds = new Set<string>();

      for (const pageData of data?.pages ?? []) {
        for (const event of pageData.data) {
          if (seenEventIds.has(event.id)) {
            continue;
          }

          seenEventIds.add(event.id);
          uniqueEvents.push(event);
        }
      }

      return uniqueEvents;
    },
    [data],
  );
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  const hasActiveFilters =
    resolvedFilters.statusMode !== defaultFilters.statusMode ||
    resolvedFilters.source !== defaultFilters.source ||
    resolvedFilters.sort !== defaultFilters.sort;
  const hasSelectedEvent = Boolean(
    events.some((event) => event.id === selectedEventId),
  );

  useEffect(() => {
    if (!selectedEventId || isLoading || hasSelectedEvent || !data) {
      return;
    }

    onClearSelectedEvent();
  }, [
    data,
    hasSelectedEvent,
    isLoading,
    onClearSelectedEvent,
    selectedEventId,
  ]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || isFetchingNextPage) {
        return;
      }

      void fetchNextPage();
    });

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section
      className={cn(
        SPLIT_VIEWER_PAGE_WIDTH,
        "flex flex-col gap-8 py-10 lg:h-screen lg:min-h-0 lg:gap-6 lg:overflow-hidden lg:py-6",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <IconCircleButton
          asChild
          icon={<PlusIcon className="size-5" />}
          className="rounded-xl"
          aria-label={browseType === "GIG" ? "Create gig" : "Create event"}
        >
          <Link
            to="/events/new"
            search={browseType === "GIG" ? { type: "GIG" } : undefined}
          >
            <PlusIcon className="size-5" />
            <span className="sr-only">
              {browseType === "GIG" ? "Create gig" : "Create event"}
            </span>
          </Link>
        </IconCircleButton>
      </div>

      {isLoading ? <EventsBrowseSkeleton /> : null}
      {isError ? (
        <EventsErrorState
          message={
            error instanceof Error ? error.message : "Failed to fetch events"
          }
        />
      ) : null}
      {events.length > 0 || data ? (
        <>
          <div className="overflow-hidden rounded-2xl border bg-background lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
            <div className="border-b lg:flex lg:min-h-0 lg:flex-col lg:border-r lg:border-b-0">
              <div className="border-b px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {totalCount} {itemLabel} found
                    </p>
                  </div>
                  {hasActiveFilters ? (
                    <Button variant="ghost" size="sm" onClick={onClearFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3">
                  <Select
                    value={resolvedFilters.statusMode}
                    onValueChange={(value) =>
                      onFilterChange("statusMode", value)
                    }
                  >
                    <SelectTrigger className="min-w-0 w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={resolvedFilters.source || "ALL"}
                    onValueChange={(value) =>
                      onFilterChange("source", value === "ALL" ? "" : value)
                    }
                  >
                    <SelectTrigger className="min-w-0 w-full">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Sources</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="OSU_API">OSU</SelectItem>
                      <SelectItem value="TICKETMASTER">Ticketmaster</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 justify-self-end"
                    aria-label={
                      isSoonestFirst
                        ? "Sort by latest first"
                        : "Sort by soonest first"
                    }
                    title={
                      isSoonestFirst ? "Soonest first" : "Latest first"
                    }
                    onClick={() =>
                      onFilterChange(
                        "sort",
                        isSoonestFirst ? "START_DESC" : "START_ASC",
                      )
                    }
                  >
                    <SortIcon className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {events.length > 0 ? (
                  <EventsList
                    events={events}
                    selectedEventId={selectedEventId}
                    showTypeBadge={false}
                    onSelectEvent={onSelectEvent}
                  />
                ) : (
                  <div className="px-4 py-6 sm:px-5">
                    <EventsEmptyState
                      title={`No ${itemLabel} found`}
                      description={
                        hasActiveFilters
                          ? "Try different filters."
                          : `No ${itemLabel} have been created yet.`
                      }
                    />
                  </div>
                )}

                {hasNextPage ? (
                  <div
                    ref={loadMoreRef}
                    className="border-t px-4 py-4 text-center text-sm text-muted-foreground sm:px-5"
                  >
                    {isFetchingNextPage
                      ? `Loading more ${itemLabel}...`
                      : "Scroll to load more"}
                  </div>
                ) : events.length > 0 ? (
                  <div className="border-t px-4 py-4 text-center text-sm text-muted-foreground sm:px-5">
                    End of results
                  </div>
                ) : null}
              </div>
            </div>

        <div className="hidden lg:block lg:min-h-0 lg:overflow-y-auto">
              {selectedEventId && hasSelectedEvent ? (
                <EventDetailSurface
                  eventId={selectedEventId}
                  mode="panel"
                  browsePath={browseType === "GIG" ? "/gigs" : "/events"}
                  browseLabel={title}
                  browseSearch={{
                    statusMode: resolvedFilters.statusMode as never,
                    source: resolvedFilters.source || undefined,
                    sort: resolvedFilters.sort as never,
                    selected: selectedEventId,
                  }}
                  onDeleteSuccess={onClearSelectedEvent}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-8 py-12 text-center">
                  <div>
                    <p className="text-lg font-medium">
                      {events.length > 0
                        ? "Choose a listing"
                        : `No ${itemLabel} to preview`}
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      {events.length > 0
                        ? `Select an ${
                            browseType === "GIG" ? "gig" : "event"
                          } from the list to inspect its details in this pane.`
                        : "Adjust filters or create a new listing to populate this view."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
