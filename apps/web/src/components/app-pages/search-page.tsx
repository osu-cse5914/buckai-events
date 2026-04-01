import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { SearchRouteSearch } from "@/lib/event-route-search";
import { toOptionalPage } from "@/lib/event-route-search";
import { Input } from "@/components/ui/input";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsList,
  EventsListSkeleton,
  EventsPagination,
  useEventsQuery,
} from "@/components/events/events-browser";

export function SearchPage({
  search,
  type,
  category,
  page,
  onSearchSubmit,
  onPageChange,
}: {
  search: string;
  type: NonNullable<SearchRouteSearch["type"]> | "";
  category: string;
  page: number;
  onSearchSubmit: (value: string) => void;
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
  const detailSearch = hasStartedSearch
    ? {
        returnTo: "search" as const,
        q: trimmedSearch || undefined,
        type: type || undefined,
        category: trimmedCategory || undefined,
        page: toOptionalPage(page),
      }
    : undefined;

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
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit(trimmedQuery);
          }}
          className="mx-auto w-full max-w-3xl"
        >
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search query"
              placeholder="Search events and gigs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-16 rounded-full border-none bg-muted/60 pl-14 pr-6 text-lg shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
            />
          </div>
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>
      </div>

      {hasStartedSearch && isLoading ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <EventsListSkeleton showPagination />
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
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <div className="overflow-hidden rounded-2xl border bg-background">
            <div className="border-b px-4 py-4 sm:px-5">
              <p className="text-sm text-muted-foreground">
                {data.pagination.total} results
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {trimmedSearch
                  ? `Results for "${trimmedSearch}"`
                  : "Search results"}
              </h2>
            </div>

            <EventsList events={data.data} detailSearch={detailSearch} />

            {data.pagination.total > data.pagination.limit ? (
              <div className="border-t px-4 py-4 sm:px-5">
                <EventsPagination
                  page={page}
                  total={data.pagination.total}
                  onPageChange={onPageChange}
                  className="mt-0"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
