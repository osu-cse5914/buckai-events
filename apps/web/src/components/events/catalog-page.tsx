import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CompassIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsGrid,
  EventsLoadingGrid,
  EventsPagination,
  useEventsQuery,
} from "@/components/events/events-browser";

type CatalogFilters = {
  type: string;
  status: string;
  source: string;
  category: string;
};

const DEFAULT_FILTERS: CatalogFilters = {
  type: "",
  status: "",
  source: "",
  category: "",
};

export function CatalogPage() {
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error } = useEventsQuery(
    {
      type: filters.type || undefined,
      status: filters.status || undefined,
      source: filters.source || undefined,
      category: filters.category.trim() || undefined,
    },
    page,
  );

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  function updateFilter(key: keyof CatalogFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <CompassIcon className="size-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Filters</p>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon className="mr-1 size-4" />
              Clear filters
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to="/search">Search</Link>
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={filters.type || "ALL"}
            onValueChange={(value) =>
              updateFilter("type", value === "ALL" ? "" : value)
            }
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
            value={filters.status || "ALL"}
            onValueChange={(value) =>
              updateFilter("status", value === "ALL" ? "" : value)
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
              updateFilter("source", value === "ALL" ? "" : value)
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

          <Input
            placeholder="Category"
            value={filters.category}
            onChange={(event) =>
              updateFilter("category", event.target.value)
            }
          />
        </div>
      </div>

      {isLoading ? <EventsLoadingGrid /> : null}
      {isError ? (
        <EventsErrorState
          message={
            error instanceof Error ? error.message : "Failed to fetch events"
          }
        />
      ) : null}
      {data && data.data.length === 0 ? (
        <EventsEmptyState
          title="No events found"
          description={
            hasActiveFilters
              ? "Try different filters."
              : "No events have been created yet."
          }
        />
      ) : null}
      {data && data.data.length > 0 ? (
        <>
          <EventsGrid events={data.data} />
          <EventsPagination
            page={page}
            total={data.pagination.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}
