import type { ReactNode } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  EventsEmptyState,
  EventsErrorState,
  EventsList,
  EventsListSkeleton,
} from "@/components/events/events-browser";
import { useApiClient } from "@/lib/api";
import {
  fetchPopularRecommendationsPage,
  fetchRecommendationsPage,
  fetchUpcomingRecommendationsPage,
  PAGE_SIZE,
  queryKeys,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

type FeaturedFilter = "" | "EVENT" | "GIG";
const FEATURED_PREVIEW_LIMIT = 3;

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
  const normalizedType = type || "ALL";
  const recommendedQuery = useInfiniteQuery({
    queryKey: queryKeys.recommendationsFeed(normalizedType, PAGE_SIZE),
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
  const popularQuery = useQuery({
    queryKey: queryKeys.recommendationsPopular(
      normalizedType,
      FEATURED_PREVIEW_LIMIT,
    ),
    queryFn: () =>
      fetchPopularRecommendationsPage(api, {
        type: type || undefined,
        limit: FEATURED_PREVIEW_LIMIT,
      }),
  });
  const upcomingQuery = useQuery({
    queryKey: queryKeys.recommendationsUpcoming(
      normalizedType,
      FEATURED_PREVIEW_LIMIT,
    ),
    queryFn: () =>
      fetchUpcomingRecommendationsPage(api, {
        type: type || undefined,
        limit: FEATURED_PREVIEW_LIMIT,
      }),
  });

  const recommendedPages = recommendedQuery.data?.pages ?? [];
  const recommendedItems = recommendedPages.flatMap((page) => page.items);
  const recommendedMeta = recommendedPages[0]?.meta;
  const rankingMode = recommendedMeta?.rankingMode;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value || "ALL"}
              variant={type === option.value ? "default" : "outline"}
              size="sm"
              className="rounded-full px-4"
              onClick={() => onTypeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {rankingMode === "POPULARITY_FALLBACK" ? (
        <div className="mx-auto w-full max-w-3xl animate-in fade-in-0 slide-in-from-bottom-3 duration-700">
          <div className="rounded-2xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Showing popular upcoming picks while your interests and activity build
            a more personalized feed.
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <FeaturedSection
          title="Recommended"
          description="Ranked for your interests and recent activity."
          summary={`Showing ${recommendedItems.length} of ${
            recommendedMeta?.total ?? recommendedItems.length
          }`}
          className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
        >
          {recommendedQuery.isPending ? (
            <EventsListSkeleton showHeader={false} framed={false} />
          ) : null}
          {recommendedQuery.isError ? (
            <FeaturedSectionInset>
              <EventsErrorState
                className="mt-0"
                message={
                  recommendedQuery.error instanceof Error
                    ? recommendedQuery.error.message
                    : "Failed to fetch recommendations"
                }
              />
            </FeaturedSectionInset>
          ) : null}
          {!recommendedQuery.isPending &&
          !recommendedQuery.isError &&
          recommendedItems.length === 0 ? (
            <FeaturedSectionInset>
              <EventsEmptyState
                className="mt-0"
                title="No recommendations yet"
                description="Check back soon for upcoming events and gigs."
              />
            </FeaturedSectionInset>
          ) : null}
          {recommendedItems.length > 0 ? (
            <>
              <EventsList events={recommendedItems} />
              <div className="flex items-center justify-between gap-4 border-t px-4 py-4 sm:px-5">
                <p className="text-sm text-muted-foreground">
                  Showing {recommendedItems.length} of{" "}
                  {recommendedMeta?.total ?? recommendedItems.length}
                </p>
                {recommendedQuery.hasNextPage ? (
                  <Button
                    variant="outline"
                    onClick={() => recommendedQuery.fetchNextPage()}
                    disabled={recommendedQuery.isFetchingNextPage}
                  >
                    {recommendedQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </FeaturedSection>

        <FeaturedSection
          title="Popular"
          description="What is drawing the most attention right now."
          summary={popularQuery.data ? `${popularQuery.data.items.length} picks` : undefined}
          className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700"
        >
          <FeaturedPreviewSectionState
            items={popularQuery.data?.items ?? []}
            isPending={popularQuery.isPending}
            isError={popularQuery.isError}
            error={popularQuery.error}
            emptyTitle="No popular picks right now"
            emptyDescription="Fresh activity will surface here as attention builds."
            errorMessage="Failed to fetch popular recommendations"
          />
        </FeaturedSection>

        <FeaturedSection
          title="Upcoming"
          description="The nearest openings and events worth scanning next."
          summary={upcomingQuery.data ? `${upcomingQuery.data.items.length} picks` : undefined}
          className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700"
        >
          <FeaturedPreviewSectionState
            items={upcomingQuery.data?.items ?? []}
            isPending={upcomingQuery.isPending}
            isError={upcomingQuery.isError}
            error={upcomingQuery.error}
            emptyTitle="No upcoming picks right now"
            emptyDescription="Newly scheduled listings will appear here as they open up."
            errorMessage="Failed to fetch upcoming recommendations"
          />
        </FeaturedSection>
      </div>
    </section>
  );
}

function FeaturedSection({
  title,
  description,
  summary,
  className,
  children,
}: {
  title: string;
  description: string;
  summary?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        {summary ? (
          <p className="text-sm text-muted-foreground">{summary}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background">
        <div>{children}</div>
      </div>
    </section>
  );
}

function FeaturedSectionInset({ children }: { children: ReactNode }) {
  return <div className="px-4 py-5 sm:px-5">{children}</div>;
}

function FeaturedPreviewSectionState({
  items,
  isPending,
  isError,
  error,
  emptyTitle,
  emptyDescription,
  errorMessage,
}: {
  items: Parameters<typeof EventsList>[0]["events"];
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  emptyTitle: string;
  emptyDescription: string;
  errorMessage: string;
}) {
  if (isPending) {
    return (
      <EventsListSkeleton
        rows={FEATURED_PREVIEW_LIMIT}
        showHeader={false}
        framed={false}
      />
    );
  }

  if (isError) {
    return (
      <FeaturedSectionInset>
        <EventsErrorState
          className="mt-0"
          message={error instanceof Error ? error.message : errorMessage}
        />
      </FeaturedSectionInset>
    );
  }

  if (items.length === 0) {
    return (
      <FeaturedSectionInset>
        <EventsEmptyState
          className="mt-0"
          title={emptyTitle}
          description={emptyDescription}
        />
      </FeaturedSectionInset>
    );
  }

  return <EventsList events={items} />;
}
