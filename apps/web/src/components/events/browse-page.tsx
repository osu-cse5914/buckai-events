import { startTransition } from "react";
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
  page = 0,
  onFilterChange,
  onClearFilters,
  onPageChange,
}: {
  browseType: "EVENT" | "GIG";
  title: string;
  filters?: BrowseFilters;
  page?: number;
  onFilterChange: (key: keyof BrowseFilters, value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}) {
  const itemLabel = browseType === "GIG" ? "gigs" : "events";
  const { data, isLoading, isError, error } = useEventsQuery(
    {
      type: browseType,
      status: filters.status || undefined,
      source: filters.source || undefined,
      category: filters.category.trim() || undefined,
    },
    page,
  );

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

        <Input
          placeholder="Category"
          value={filters.category}
          onChange={(event) =>
            startTransition(() =>
              onFilterChange("category", event.target.value),
            )
          }
        />
      </div>

      {hasActiveFilters ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}

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
          title={`No ${itemLabel} found`}
          description={
            hasActiveFilters
              ? "Try different filters."
              : `No ${itemLabel} have been created yet.`
          }
        />
      ) : null}
      {data && data.data.length > 0 ? (
        <>
          <EventsGrid events={data.data} showTypeBadge={false} />
          <EventsPagination
            page={page}
            total={data.pagination.total}
            onPageChange={onPageChange}
          />
        </>
      ) : null}
    </section>
  );
}
