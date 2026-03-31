import { startTransition, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
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
  onSearchSubmit,
  onTypeChange,
  onCategoryChange,
  onClearFilters,
  onPageChange,
}: {
  search: string;
  type: string;
  category: string;
  page: number;
  onSearchSubmit: (value: string) => void;
  onTypeChange: (value: "" | "EVENT" | "GIG") => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}) {
  const [query, setQuery] = useState(search);

  useEffect(() => {
    setQuery(search);
  }, [search]);

  const trimmedSearch = search.trim();
  const trimmedQuery = query.trim();
  const trimmedCategory = category.trim();
  const hasStartedSearch = Boolean(trimmedSearch || type || trimmedCategory);

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
          Search
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Find events and gigs directly, then hand off to AI when you want a
          conversational follow-up.
        </p>
      </div>

      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit(trimmedQuery);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search query"
                placeholder="Search events and gigs"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

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
                  search={trimmedQuery ? { prompt: trimmedQuery } : {}}
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
      </div>

      {!hasStartedSearch ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700 py-12 text-sm text-muted-foreground">
          Use the search form to get started.
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
