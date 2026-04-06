import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatAttribution,
  formatCompensation,
  formatDate,
  formatStatusLabel,
  formatTypeLabel,
} from "@/lib/formatters";
import { palette } from "@/lib/theme";
import type { EventListItem } from "@/lib/types";

export function EventCard({
  event,
  onPress,
}: {
  event: EventListItem;
  onPress: () => void;
}) {
  const compensation = formatCompensation(event);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.badgeRow}>
        <Badge label={formatTypeLabel(event.type)} tone="primary" />
        <Badge label={formatStatusLabel(event.status)} tone="muted" />
      </View>

      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.summary} numberOfLines={2}>
        {event.summary ?? event.description}
      </Text>

      <View style={styles.metaGroup}>
        <Text style={styles.metaText}>{formatDate(event.startAt)}</Text>
        <Text style={styles.metaText}>{event.locationName}</Text>
        <Text style={styles.metaText}>By {formatAttribution(event)}</Text>
        {compensation ? <Text style={styles.compensation}>{compensation}</Text> : null}
      </View>
    </Pressable>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "muted";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "primary" ? styles.badgePrimary : styles.badgeMuted,
      ]}
    >
      <Text
        style={[
          styles.badgeLabel,
          tone === "primary" ? styles.badgePrimaryLabel : styles.badgeMutedLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 18,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePrimary: {
    backgroundColor: "#fed7aa",
  },
  badgeMuted: {
    backgroundColor: "#efe7d9",
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badgePrimaryLabel: {
    color: "#9a3412",
  },
  badgeMutedLabel: {
    color: palette.textMuted,
  },
  title: {
    color: palette.text,
    fontSize: 19,
    fontWeight: "700",
  },
  summary: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaGroup: {
    gap: 4,
  },
  metaText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  compensation: {
    color: palette.accentStrong,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
});
