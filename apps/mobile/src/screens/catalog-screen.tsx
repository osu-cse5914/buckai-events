import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { EventCard } from "@/components/event-card";
import { FilterChips } from "@/components/filter-chips";
import { MessageBlock } from "@/components/state-block";
import { useApiClient } from "@/lib/api";
import { fetchCatalogPage, PAGE_SIZE, queryKeys } from "@/lib/queries";
import { palette } from "@/lib/theme";
import type { EventTypeFilter } from "@/lib/types";

const filterOptions = [
  { label: "All", value: "ALL" },
  { label: "Events", value: "EVENT" },
  { label: "Gigs", value: "GIG" },
] as const;

function toApiType(value: EventTypeFilter) {
  return value === "ALL" ? undefined : value;
}

export function CatalogScreen() {
  const api = useApiClient();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<EventTypeFilter>("ALL");

  const catalogQuery = useInfiniteQuery({
    queryKey: queryKeys.catalog(selectedType, PAGE_SIZE),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchCatalogPage(api, {
        type: toApiType(selectedType),
        limit: PAGE_SIZE,
        offset: Number(pageParam),
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.data.length, 0);
      return loaded < lastPage.pagination.total ? loaded : undefined;
    },
  });

  const events = catalogQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const total = catalogQuery.data?.pages[0]?.pagination.total ?? 0;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#fdf0db", "#fffaf4"]} style={styles.hero}>
        <Text style={styles.kicker}>Catalog</Text>
        <Text style={styles.heroTitle}>Neutral browse, tuned for a thumb.</Text>
        <Text style={styles.heroBody}>
          Scan the full event and gig catalog without recommendation framing, then drill
          into a listing when it earns a closer look.
        </Text>
        <FilterChips
          options={filterOptions}
          selectedValue={selectedType}
          onChange={setSelectedType}
        />
      </LinearGradient>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{total} listings found</Text>
      </View>

      {catalogQuery.isPending ? <MessageBlock title="Loading catalog..." /> : null}
      {catalogQuery.isError ? (
        <MessageBlock
          title="Could not load the catalog"
          detail={
            catalogQuery.error instanceof Error
              ? catalogQuery.error.message
              : "Please try again."
          }
          tone="danger"
        />
      ) : null}
      {!catalogQuery.isPending && !catalogQuery.isError && events.length === 0 ? (
        <MessageBlock
          title="Nothing matches this filter"
          detail="Try a different mix of event and gig results."
        />
      ) : null}

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onPress={() =>
            router.push({
              pathname: "/events/[eventId]",
              params: { eventId: event.id },
            })
          }
        />
      ))}
    </ScrollView>
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
  },
  summaryRow: {
    paddingHorizontal: 4,
  },
  summaryText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
