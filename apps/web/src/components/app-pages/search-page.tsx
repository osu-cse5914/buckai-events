import { useEffect, useRef } from "react";
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
  const queryInputRef = useRef<HTMLInputElement>(null);
  const pendingSearchUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    const queryInput = queryInputRef.current;

    if (!queryInput || queryInput.value === search) {
      return;
    }

    queryInput.value = search;
  }, [search]);

  useEffect(() => {
    return () => {
      if (pendingSearchUpdateRef.current == null) {
        return;
      }

      window.clearTimeout(pendingSearchUpdateRef.current);
    };
  }, []);

  function submitSearch(
    nextSearch: string,
    nextType: NonNullable<SearchRouteSearch["type"]> | "",
  ) {
    onSearchSubmit({
      search: nextSearch.trim(),
      type: nextType,
      category,
    });
  }

  function clearPendingSearchUpdate() {
    if (pendingSearchUpdateRef.current == null) {
      return;
    }

    window.clearTimeout(pendingSearchUpdateRef.current);
    pendingSearchUpdateRef.current = null;
  }

  function submitCurrentSearch(nextType = type) {
    clearPendingSearchUpdate();
    submitSearch(queryInputRef.current?.value ?? search, nextType);
  }

  function scheduleSearchUpdate() {
    const nextSearch = queryInputRef.current?.value ?? "";

    clearPendingSearchUpdate();

    if (nextSearch.trim() === search.trim()) {
      return;
    }

    pendingSearchUpdateRef.current = window.setTimeout(() => {
      pendingSearchUpdateRef.current = null;
      submitSearch(nextSearch, type);
    }, SEARCH_UPDATE_DEBOUNCE_MS);
  }

  const trimmedSearch = search.trim();
  const trimmedCategory = category.trim();
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
            submitCurrentSearch();
          }}
          className="mx-auto w-full max-w-4xl"
        >
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search query"
              placeholder="Search events and gigs"
              defaultValue={search}
              onChange={scheduleSearchUpdate}
              ref={queryInputRef}
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
                      variant={type === option.value ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-4"
                      onClick={() => submitCurrentSearch(option.value)}
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
