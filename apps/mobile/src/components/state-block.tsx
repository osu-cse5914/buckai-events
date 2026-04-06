import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { palette } from "@/lib/theme";

export function LoadingBlock({ label }: { label: string }) {
  return (
    <View style={styles.block}>
      <ActivityIndicator color={palette.accentStrong} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function MessageBlock({
  title,
  detail,
  tone = "neutral",
}: {
  title: string;
  detail?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <View style={[styles.block, tone === "danger" ? styles.dangerBlock : null]}>
      <Text style={[styles.title, tone === "danger" ? styles.dangerTitle : null]}>
        {title}
      </Text>
      {detail ? <Text style={styles.text}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 18,
  },
  dangerBlock: {
    borderColor: "#f5c2b3",
    backgroundColor: "#fff1eb",
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  dangerTitle: {
    color: palette.danger,
  },
  text: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
