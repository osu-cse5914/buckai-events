import type { ReactNode } from "react";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { FollowingSection } from "@/components/app-pages/social-feed-section";
import { Button } from "@/components/ui/button";
import { PillTabButton, PillTabs } from "@/components/ui/pill-tabs";
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
import type { EventDetailRouteSearch } from "@/lib/event-route-search";
import { cn } from "@/lib/utils";

type FeaturedFilter = "" | "EVENT" | "GIG";
type FeaturedLane = "recommended" | "following" | "popular" | "upcoming";
const FEATURED_PREVIEW_LIMIT = 3;

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "EVENT", label: "Events" },
  { value: "GIG", label: "Gigs" },
] as const satisfies ReadonlyArray<{ value: FeaturedFilter; label: string }>;

const LANE_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "following", label: "Following" },
  { value: "popular", label: "Popular" },
  { value: "upcoming", label: "Upcoming" },
] as const satisfies ReadonlyArray<{ value: FeaturedLane; label: string }>;

export function FeaturedPage({
  type = "",
  onTypeChange,
}: {
  type?: FeaturedFilter;
  onTypeChange: (value: FeaturedFilter) => void;
}) {
  const [activeLane, setActiveLane] = useState<FeaturedLane>("recommended");
  const api = useApiClient();
  const normalizedType = type || "ALL";
  const recommendedQuery = useInfiniteQuery({
    queryKey: queryKeys.recommendationsFeed(
      normalizedType,
      "",
      PAGE_SIZE,
    ),
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
      "",
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
      "",
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
  const detailSearch = {
    returnTo: "featured" as const,
    type: type || undefined,
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
        <div className="flex flex-wrap items-center gap-3">
          <PillTabs
            role="tablist"
            aria-label="Featured sections"
            className="animate-in fade-in-0 slide-in-from-bottom-4 flex flex-wrap gap-2 duration-700"
          >
            {LANE_OPTIONS.map((lane) => {
              const isActive = activeLane === lane.value;

              return (
                <PillTabButton
                  key={lane.value}
                  active={isActive}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls={`featured-panel-${lane.value}`}
                  id={`featured-tab-${lane.value}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveLane(lane.value)}
                >
                  {lane.label}
                </PillTabButton>
              );
            })}
          </PillTabs>
          <div aria-hidden="true" className="h-6 w-px bg-border" />
          <PillTabs>
            {FILTER_OPTIONS.map((option) => (
              <PillTabButton
                key={option.value || "ALL"}
                active={type === option.value}
                onClick={() => onTypeChange(option.value)}
              >
                {option.label}
              </PillTabButton>
            ))}
          </PillTabs>
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

      <div className="space-y-4">
        <div
          id="featured-panel-recommended"
          role="tabpanel"
          aria-labelledby="featured-tab-recommended"
          hidden={activeLane !== "recommended"}
          className={cn(activeLane === "recommended" ? "block" : "hidden")}
        >
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
                <EventsList events={recommendedItems} detailSearch={detailSearch} />
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
                      {recommendedQuery.isFetchingNextPage
                        ? "Loading..."
                        : "Load more"}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </FeaturedSection>
        </div>

        <div
          id="featured-panel-following"
          role="tabpanel"
          aria-labelledby="featured-tab-following"
          hidden={activeLane !== "following"}
          className={cn(activeLane === "following" ? "block" : "hidden")}
        >
          <FollowingSection
            className="animate-in fade-in-0 slide-in-from-bottom-5 duration-700"
            detailSearch={detailSearch}
          />
        </div>

        <div
          id="featured-panel-popular"
          role="tabpanel"
          aria-labelledby="featured-tab-popular"
          hidden={activeLane !== "popular"}
          className={cn(activeLane === "popular" ? "block" : "hidden")}
        >
          <FeaturedSection
            title="Popular"
            description="What is drawing the most attention right now."
            summary={popularQuery.data ? `${popularQuery.data.items.length} picks` : undefined}
            className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700"
          >
            <FeaturedPreviewSectionState
              items={popularQuery.data?.items ?? []}
              detailSearch={detailSearch}
              isPending={popularQuery.isPending}
              isError={popularQuery.isError}
              error={popularQuery.error}
              emptyTitle="No popular picks right now"
              emptyDescription="Fresh activity will surface here as attention builds."
              errorMessage="Failed to fetch popular recommendations"
            />
          </FeaturedSection>
        </div>

        <div
          id="featured-panel-upcoming"
          role="tabpanel"
          aria-labelledby="featured-tab-upcoming"
          hidden={activeLane !== "upcoming"}
          className={cn(activeLane === "upcoming" ? "block" : "hidden")}
        >
          <FeaturedSection
            title="Upcoming"
            description="The nearest openings and events worth scanning next."
            summary={upcomingQuery.data ? `${upcomingQuery.data.items.length} picks` : undefined}
            className="animate-in fade-in-0 slide-in-from-bottom-7 duration-700"
          >
            <FeaturedPreviewSectionState
              items={upcomingQuery.data?.items ?? []}
              detailSearch={detailSearch}
              isPending={upcomingQuery.isPending}
              isError={upcomingQuery.isError}
              error={upcomingQuery.error}
              emptyTitle="No upcoming picks right now"
              emptyDescription="Newly scheduled listings will appear here as they open up."
              errorMessage="Failed to fetch upcoming recommendations"
            />
          </FeaturedSection>
        </div>
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
  detailSearch,
  isPending,
  isError,
  error,
  emptyTitle,
  emptyDescription,
  errorMessage,
}: {
  items: Parameters<typeof EventsList>[0]["events"];
  detailSearch?: EventDetailRouteSearch;
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

  return <EventsList events={items} detailSearch={detailSearch} />;
}
