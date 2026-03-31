import { startTransition } from "react";
import { Link } from "@tanstack/react-router";
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

export function SearchPage({
  search,
  type,
  category,
  page,
  onTypeChange,
  onCategoryChange,
  onClearFilters,
  onPageChange,
}: {
  search: string;
  type: string;
  category: string;
  page: number;
  onTypeChange: (value: "" | "EVENT" | "GIG") => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}) {
  const trimmedSearch = search.trim();
  const trimmedCategory = category.trim();
  const hasStartedSearch = Boolean(
    trimmedSearch || type || trimmedCategory,
  );

  const { data, isLoading, isError, error } = useEventsQuery(
    {
      search: trimmedSearch || undefined,
      type: type || undefined,
      category: trimmedCategory || undefined,
    },
    page,
    hasStartedSearch,
  );

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          {search || "Search"}
        </h1>
      </div>

      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Select
              value={type || "ALL"}
              onValueChange={(value) =>
                onTypeChange(value === "ALL" ? "" : (value as "EVENT" | "GIG"))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Type</SelectItem>
                <SelectItem value="EVENT">Event</SelectItem>
                <SelectItem value="GIG">Gig</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Category"
              value={category}
              onChange={(event) =>
                startTransition(() => onCategoryChange(event.target.value))
              }
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link
                to="/ai"
                search={trimmedSearch ? { prompt: trimmedSearch } : {}}
              >
                Ask AI
              </Link>
            </Button>
            {(type || category) ? (
              <Button variant="outline" onClick={onClearFilters}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {!hasStartedSearch ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700 py-12 text-sm text-muted-foreground">
          Use the search bar above.
        </div>
      ) : null}

      {hasStartedSearch && isLoading ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsLoadingGrid />
        </div>
      ) : null}
      {hasStartedSearch && isError ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsErrorState
            message={
              error instanceof Error ? error.message : "Failed to fetch events"
            }
          />
        </div>
      ) : null}
      {hasStartedSearch && data && data.data.length === 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsEmptyState
            title="No results matched your search"
            description="Try a broader query."
          />
        </div>
      ) : null}
      {hasStartedSearch && data && data.data.length > 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700 space-y-6">
          <EventsGrid events={data.data} />
          <EventsPagination
            page={page}
            total={data.pagination.total}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </section>
  );
}
