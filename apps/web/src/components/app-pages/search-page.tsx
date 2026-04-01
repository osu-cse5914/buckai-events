import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SearchIcon, SparklesIcon } from "lucide-react";
import type { SearchRouteSearch } from "@/lib/event-route-search";
import { toOptionalPage } from "@/lib/event-route-search";
import { Input } from "@/components/ui/input";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsList,
  EventsListSkeleton,
  EventsPagination,
  useSearchResultsQuery,
} from "@/components/events/events-browser";
import { Button } from "@/components/ui/button";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "EVENT", label: "Events" },
  { value: "GIG", label: "Gigs" },
] as const satisfies ReadonlyArray<{
  value: NonNullable<SearchRouteSearch["type"]> | "";
  label: string;
}>;

const SEARCH_UPDATE_DEBOUNCE_MS = 300;

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
  onSearchSubmit: (value: {
    search: string;
    type: NonNullable<SearchRouteSearch["type"]> | "";
    category: string;
  }) => void;
  onPageChange: (page: number) => void;
}) {
  const [query, setQuery] = useState(search);
  const [draftType, setDraftType] = useState(type);

  useEffect(() => {
    setQuery(search);
    setDraftType(type);
  }, [search, type]);

  useEffect(() => {
    const nextSearch = query.trim();
    const currentSearch = search.trim();

    if (nextSearch === currentSearch && draftType === type) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onSearchSubmit({
        search: nextSearch,
        type: draftType,
        category,
      });
    }, SEARCH_UPDATE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [category, draftType, onSearchSubmit, query, search, type]);

  const trimmedSearch = search.trim();
  const trimmedCategory = category.trim();
  const trimmedQuery = query.trim();
  const hasActiveQuery = Boolean(trimmedSearch);
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

  const { data, isLoading, isError, error } = useSearchResultsQuery(
    {
      query: trimmedSearch || undefined,
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
            onSearchSubmit({
              search: trimmedQuery,
              type: draftType,
              category,
            });
          }}
          className="mx-auto w-full max-w-4xl"
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
      {hasStartedSearch && data ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700">
          <div className="overflow-hidden rounded-2xl border bg-background">
            <div className="flex flex-col gap-4 border-b px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {data.pagination.total} results
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {trimmedSearch
                    ? `Results for "${trimmedSearch}"`
                    : "Filtered results"}
                </h2>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Type filter"
                >
                  {TYPE_FILTER_OPTIONS.map((option) => (
                    <Button
                      key={option.value || "ALL"}
                      type="button"
                      variant={draftType === option.value ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-4"
                      onClick={() => setDraftType(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                {hasActiveQuery ? (
                  <Button asChild variant="outline">
                    <Link
                      to="/ai"
                      search={{
                        prompt: trimmedSearch,
                      }}
                    >
                      <SparklesIcon />
                      Ask BuckAI
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            {data.data.length === 0 ? (
              <EventsEmptyState
                title="No results matched your search"
                description="Try a broader query."
              />
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
