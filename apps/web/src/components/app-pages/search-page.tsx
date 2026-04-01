import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  EventsCollectionSkeleton,
  EventsEmptyState,
  EventsErrorState,
  EventsGrid,
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
  type: string;
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
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
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
          <EventsCollectionSkeleton showPagination />
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
