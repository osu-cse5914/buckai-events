import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  CalendarIcon,
  MapPinIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  STATUS_STYLES,
  STATUS_LABELS,
  TYPE_STYLES,
  formatDate,
} from "@/lib/event-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/events/")({
  component: EventsPage,
});

const PAGE_SIZE = 12;

interface Filters {
  search: string;
  type: string;
  status: string;
  source: string;
  category: string;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  type: "",
  status: "",
  source: "",
  category: "",
};

function useEvents(filters: Filters, page: number) {
  return useQuery({
    queryKey: ["events", filters, page],
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

      const res = await api.api.v1.events.$get({ query });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

function EventsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error } = useEvents(filters, page);

  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon className="mr-1 size-4" />
              Clear filters
            </Button>
          )}
          <Button size="sm" asChild>
            <Link to="/events/new">Create Event</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-4">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          key={`type-${filters.type}`}
          value={filters.type || undefined}
          onValueChange={(v) => updateFilter("type", v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="EVENT">Event</SelectItem>
            <SelectItem value="GIG">Gig</SelectItem>
          </SelectContent>
        </Select>

        <Select
          key={`status-${filters.status}`}
          value={filters.status || undefined}
          onValueChange={(v) => updateFilter("status", v === "ALL" ? "" : v)}
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
          key={`source-${filters.source}`}
          value={filters.source || undefined}
          onValueChange={(v) => updateFilter("source", v === "ALL" ? "" : v)}
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

        <Input
          placeholder="Category"
          value={filters.category}
          onChange={(e) => updateFilter("category", e.target.value)}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
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
      )}

      {/* Error */}
      {isError && (
        <div className="mt-8 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load events"}
        </div>
      )}

      {/* Empty */}
      {data && data.data.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-medium">No events found</p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your filters."
              : "No events have been created yet."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Event cards */}
      {data && data.data.length > 0 && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((event) => (
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
                    <CardTitle className="mt-2 line-clamp-2 group-hover:underline">
                      {event.title}
                    </CardTitle>
                    {event.category && (
                      <CardDescription className="capitalize">
                        {event.category}
                      </CardDescription>
                    )}
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
                    {event.type === "GIG" &&
                      event.compensationAmount != null && (
                        <p className="font-medium text-foreground">
                          ${event.compensationAmount}
                          {event.compensationType === "HOURLY" ? "/hr" : " fixed"}
                        </p>
                      )}
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground">
                    {event.creator?.displayName ?? "Unknown"}
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, data.pagination.total)} of{" "}
                {data.pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={i === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(i)}
                    className="min-w-9"
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
