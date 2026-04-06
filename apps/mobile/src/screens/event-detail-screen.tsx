import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { MessageBlock } from "@/components/state-block";
import { useApiClient } from "@/lib/api";
import {
  formatAttribution,
  formatCompensation,
  formatDateLong,
  formatStatusLabel,
  formatTypeLabel,
} from "@/lib/formatters";
import { eventDetailQueryOptions } from "@/lib/queries";
import { palette } from "@/lib/theme";

export function EventDetailScreen() {
  const api = useApiClient();
  const params = useLocalSearchParams<{ eventId: string }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;

  const eventQuery = useQuery(
    eventDetailQueryOptions(api, eventId ?? ""),
  );

  if (!eventId) {
    return (
      <View style={styles.page}>
        <MessageBlock title="Missing event id" tone="danger" />
      </View>
    );
  }

  if (eventQuery.isPending) {
    return (
      <View style={styles.page}>
        <MessageBlock title="Loading event..." />
      </View>
    );
  }

  if (eventQuery.isError) {
    return (
      <View style={styles.page}>
        <MessageBlock
          title="Could not load event"
          detail={
            eventQuery.error instanceof Error
              ? eventQuery.error.message
              : "Please try again."
          }
          tone="danger"
        />
      </View>
    );
  }

  if (!eventQuery.data) {
    return (
      <View style={styles.page}>
        <MessageBlock title="Event not found" />
      </View>
    );
  }

  const event = eventQuery.data;
  const compensation = formatCompensation(event);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.typeLine}>
          {formatTypeLabel(event.type)} · {formatStatusLabel(event.status)}
        </Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.subtitle}>
          {event.summary ?? event.description}
        </Text>
      </View>

      <View style={styles.card}>
        <Detail label="When" value={formatDateLong(event.startAt)} />
        <Detail label="Where" value={event.locationName} />
        <Detail label="By" value={formatAttribution(event)} />
        {compensation ? <Detail label="Compensation" value={compensation} /> : null}
        {event.category ? <Detail label="Category" value={event.category} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{event.description}</Text>
      </View>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    gap: 10,
    borderRadius: 30,
    backgroundColor: "#fff4e6",
    padding: 22,
  },
  typeLine: {
    color: palette.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 35,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 20,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
  },
  detail: {
    gap: 4,
  },
  detailLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailValue: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 22,
  },
  description: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 24,
  },
});
