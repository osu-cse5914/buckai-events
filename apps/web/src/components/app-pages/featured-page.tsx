import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsGrid,
  EventsLoadingGrid,
} from "@/components/events/events-browser";
import { useApiClient } from "@/lib/api";
import {
  fetchRecommendationsPage,
  PAGE_SIZE,
  queryKeys,
} from "@/lib/queries";

type FeaturedFilter = "" | "EVENT" | "GIG";

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "EVENT", label: "Events" },
  { value: "GIG", label: "Gigs" },
] as const satisfies ReadonlyArray<{ value: FeaturedFilter; label: string }>;

export function FeaturedPage({
  type = "",
  onTypeChange,
}: {
  type?: FeaturedFilter;
  onTypeChange: (value: FeaturedFilter) => void;
}) {
  const api = useApiClient();
  const query = useInfiniteQuery({
    queryKey: queryKeys.recommendationsFeed(type || "ALL"),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchRecommendationsPage(api, {
        type: type || undefined,
        offset: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.meta.total ? loaded : undefined;
    },
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const firstMeta = pages[0]?.meta;
  const rankingMode = firstMeta?.rankingMode;

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Featured</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Personalized discovery for upcoming events and gigs.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value || "ALL"}
            variant={type === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {rankingMode === "POPULARITY_FALLBACK" ? (
        <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Showing popular upcoming picks while your interests and activity build a
          more personalized feed.
        </div>
      ) : null}

      {query.isPending ? <EventsLoadingGrid /> : null}
      {query.isError ? (
        <EventsErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : "Failed to fetch recommendations"
          }
        />
      ) : null}
      {!query.isPending && !query.isError && items.length === 0 ? (
        <EventsEmptyState
          title="No recommendations yet"
          description="Check back soon for upcoming events and gigs."
        />
      ) : null}
      {items.length > 0 ? (
        <>
          <EventsGrid events={items} />
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {items.length} of {firstMeta?.total ?? items.length}
            </p>
            {query.hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
