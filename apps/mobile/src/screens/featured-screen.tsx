import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { EventCard } from "@/components/event-card";
import { FilterChips } from "@/components/filter-chips";
import { MessageBlock } from "@/components/state-block";
import { useApiClient } from "@/lib/api";
import {
  FEATURED_PREVIEW_LIMIT,
  fetchPopularRecommendations,
  fetchRecommendationsPage,
  fetchUpcomingRecommendations,
  PAGE_SIZE,
  queryKeys,
} from "@/lib/queries";
import { palette } from "@/lib/theme";
import type {
  EventListItem,
  FeaturedFilter,
  RecommendationRankingMode,
} from "@/lib/types";

export type FeaturedSectionState = {
  items: EventListItem[];
  total: number;
  isPending: boolean;
  isError: boolean;
  errorMessage: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

const filterOptions = [
  { label: "All", value: "ALL" },
  { label: "Events", value: "EVENT" },
  { label: "Gigs", value: "GIG" },
] as const;

function toApiType(value: FeaturedFilter) {
  return value === "ALL" ? undefined : value;
}

export function FeaturedScreen() {
  const api = useApiClient();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<FeaturedFilter>("ALL");

  const recommendedQuery = useInfiniteQuery({
    queryKey: queryKeys.recommended(selectedType, PAGE_SIZE),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchRecommendationsPage(api, {
        type: toApiType(selectedType),
        limit: PAGE_SIZE,
        offset: Number(pageParam),
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.meta.total ? loaded : undefined;
    },
  });

  const popularQuery = useQuery({
    queryKey: queryKeys.popular(selectedType),
    queryFn: () =>
      fetchPopularRecommendations(api, {
        type: toApiType(selectedType),
        limit: FEATURED_PREVIEW_LIMIT,
      }),
  });

  const upcomingQuery = useQuery({
    queryKey: queryKeys.upcoming(selectedType),
    queryFn: () =>
      fetchUpcomingRecommendations(api, {
        type: toApiType(selectedType),
        limit: FEATURED_PREVIEW_LIMIT,
      }),
  });

  const recommendedItems = recommendedQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const rankingMode = recommendedQuery.data?.pages[0]?.meta.rankingMode;

  return (
    <FeaturedContent
      selectedType={selectedType}
      onTypeChange={setSelectedType}
      onOpenEvent={(eventId) =>
        router.push({
          pathname: "/events/[eventId]",
          params: { eventId },
        })
      }
      recommendedSection={{
        items: recommendedItems,
        total: recommendedQuery.data?.pages[0]?.meta.total ?? 0,
        isPending: recommendedQuery.isPending,
        isError: recommendedQuery.isError,
        errorMessage:
          recommendedQuery.error instanceof Error
            ? recommendedQuery.error.message
            : "Failed to load recommendations",
        hasNextPage: Boolean(recommendedQuery.hasNextPage),
        isFetchingNextPage: recommendedQuery.isFetchingNextPage,
      }}
      popularSection={{
        items: popularQuery.data?.items ?? [],
        total: popularQuery.data?.meta.total ?? 0,
        isPending: popularQuery.isPending,
        isError: popularQuery.isError,
        errorMessage:
          popularQuery.error instanceof Error
            ? popularQuery.error.message
            : "Failed to load popular picks",
        hasNextPage: false,
        isFetchingNextPage: false,
      }}
      upcomingSection={{
        items: upcomingQuery.data?.items ?? [],
        total: upcomingQuery.data?.meta.total ?? 0,
        isPending: upcomingQuery.isPending,
        isError: upcomingQuery.isError,
        errorMessage:
          upcomingQuery.error instanceof Error
            ? upcomingQuery.error.message
            : "Failed to load upcoming picks",
        hasNextPage: false,
        isFetchingNextPage: false,
      }}
      rankingMode={rankingMode}
      onLoadMoreRecommended={() => recommendedQuery.fetchNextPage()}
    />
  );
}

export function FeaturedContent({
  selectedType,
  onTypeChange,
  onOpenEvent,
  recommendedSection,
  popularSection,
  upcomingSection,
  rankingMode,
  onLoadMoreRecommended,
}: {
  selectedType: FeaturedFilter;
  onTypeChange: (value: FeaturedFilter) => void;
  onOpenEvent: (eventId: string) => void;
  recommendedSection: FeaturedSectionState;
  popularSection: FeaturedSectionState;
  upcomingSection: FeaturedSectionState;
  rankingMode?: RecommendationRankingMode;
  onLoadMoreRecommended?: () => void;
}) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#fff4e6", "#fffaf4"]}
        style={styles.hero}
      >
        <Text style={styles.kicker}>Featured</Text>
        <Text style={styles.heroTitle}>Campus momentum, without the noise.</Text>
        <Text style={styles.heroBody}>
          A mobile-first sweep of recommended events, active gigs, and the near-term pulse
          of Social OSU.
        </Text>
        <FilterChips
          options={filterOptions}
          selectedValue={selectedType}
          onChange={onTypeChange}
        />
      </LinearGradient>

      {rankingMode === "POPULARITY_FALLBACK" ? (
        <MessageBlock
          title="Popular upcoming picks are leading for now"
          detail="Your recommendations will personalize as your interests and activity build."
        />
      ) : null}

      <Section
        title="Recommended"
        subtitle="Ranked for your interests and recent signals."
        section={recommendedSection}
        onOpenEvent={onOpenEvent}
        footer={
          recommendedSection.hasNextPage ? (
            <Pressable style={styles.loadMoreButton} onPress={onLoadMoreRecommended}>
              {recommendedSection.isFetchingNextPage ? (
                <ActivityIndicator color="#fffaf4" />
              ) : (
                <Text style={styles.loadMoreLabel}>Load more</Text>
              )}
            </Pressable>
          ) : null
        }
      />

      <Section
        title="Popular"
        subtitle="What people are gravitating toward right now."
        section={popularSection}
        onOpenEvent={onOpenEvent}
      />

      <Section
        title="Upcoming"
        subtitle="The next openings and events worth scanning."
        section={upcomingSection}
        onOpenEvent={onOpenEvent}
      />
    </ScrollView>
  );
}

function Section({
  title,
  subtitle,
  section,
  onOpenEvent,
  footer,
}: {
  title: string;
  subtitle: string;
  section: FeaturedSectionState;
  onOpenEvent: (eventId: string) => void;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>

      {section.isPending ? (
        <MessageBlock title={`Loading ${title.toLowerCase()}...`} />
      ) : null}

      {section.isError ? (
        <MessageBlock
          title={`Could not load ${title.toLowerCase()}`}
          detail={section.errorMessage ?? undefined}
          tone="danger"
        />
      ) : null}

      {!section.isPending && !section.isError && section.items.length === 0 ? (
        <MessageBlock
          title={`No ${title.toLowerCase()} listings yet`}
          detail="Try another filter or check back after more campus activity lands."
        />
      ) : null}

      {!section.isPending && !section.isError
        ? section.items.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => onOpenEvent(event.id)}
            />
          ))
        : null}

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    gap: 14,
    borderRadius: 32,
    padding: 22,
  },
  kicker: {
    color: palette.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 35,
  },
  heroBody: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  loadMoreButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: palette.accentStrong,
    minHeight: 46,
  },
  loadMoreLabel: {
    color: "#fffaf4",
    fontSize: 15,
    fontWeight: "700",
  },
});
