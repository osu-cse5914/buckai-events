import { startTransition, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventDetailSurface } from "@/components/events/event-detail-surface";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsList,
  EventsLoadingGrid,
  useInfiniteEventsQuery,
} from "@/components/events/events-browser";

type BrowseFilters = {
  status: string;
  source: string;
  category: string;
};

const DEFAULT_FILTERS: BrowseFilters = {
  status: "",
  source: "",
  category: "",
};

export function BrowsePage({
  browseType,
  title,
  filters = DEFAULT_FILTERS,
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
  const itemLabel = browseType === "GIG" ? "gigs" : "events";
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
      status: filters.status || undefined,
      source: filters.source || undefined,
      category: filters.category.trim() || undefined,
    },
  );
  const events = useMemo(
    () => data?.pages.flatMap((pageData) => pageData.data) ?? [],
    [data],
  );
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");
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
    <section className="flex w-full flex-col gap-8 px-6 py-10 lg:h-screen lg:min-h-0 lg:gap-6 lg:overflow-hidden lg:py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <Button
          size="icon"
          asChild
          aria-label={browseType === "GIG" ? "Create gig" : "Create event"}
        >
          <Link
            to="/events/new"
            search={browseType === "GIG" ? { type: "GIG" } : undefined}
          >
            <PlusIcon className="size-5" />
          </Link>
        </Button>
      </div>

      {isLoading ? <EventsLoadingGrid /> : null}
      {isError ? (
        <EventsErrorState
          message={
            error instanceof Error ? error.message : "Failed to fetch events"
          }
        />
      ) : null}
      {events.length > 0 || data ? (
        <>
          <div className="overflow-hidden border bg-background lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Select
                    value={filters.status || "ALL"}
                    onValueChange={(value) =>
                      onFilterChange("status", value === "ALL" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.source || "ALL"}
                    onValueChange={(value) =>
                      onFilterChange("source", value === "ALL" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Sources</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="OSU_API">OSU</SelectItem>
                      <SelectItem value="TICKETMASTER">Ticketmaster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  className="mt-3"
                  placeholder="Category"
                  value={filters.category}
                  onChange={(event) =>
                    startTransition(() =>
                      onFilterChange("category", event.target.value),
                    )
                  }
                />
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
