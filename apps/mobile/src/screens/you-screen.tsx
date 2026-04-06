import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MessageBlock } from "@/components/state-block";
import { useApiClient } from "@/lib/api";
import { currentUserQueryOptions } from "@/lib/queries";
import { palette } from "@/lib/theme";

export function YouScreen() {
  const api = useApiClient();
  const router = useRouter();
  const clerk = useClerk();
  const profileQuery = useQuery(currentUserQueryOptions(api));

  if (profileQuery.isPending) {
    return (
      <View style={styles.page}>
        <MessageBlock title="Loading your workspace..." />
      </View>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <View style={styles.page}>
        <MessageBlock
          title="Could not load your workspace"
          detail={
            profileQuery.error instanceof Error
              ? profileQuery.error.message
              : "Please try again."
          }
          tone="danger"
        />
      </View>
    );
  }

  const user = profileQuery.data;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#fdf0db", "#fffaf4"]} style={styles.hero}>
        <Text style={styles.kicker}>You</Text>
        <Text style={styles.heroTitle}>
          {user.displayName ? `Hi, ${user.displayName}.` : "Your campus HQ."}
        </Text>
        <Text style={styles.heroBody}>
          Keep your profile sharp, carry your interests forward, and stay ready for the
          next recommendation cycle.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile snapshot</Text>
        <Field label="Email" value={user.email} />
        <Field label="Major" value={user.major ?? "Add your major"} />
        <Field
          label="Interests"
          value={user.interests.length ? user.interests.join(", ") : "Choose a few interests"}
        />
      </View>

      <View style={styles.statsRow}>
        <Stat label="Followers" value={String(user.followerCount)} />
        <Stat label="Following" value={String(user.followingCount)} />
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.push("/profile")}>
        <Text style={styles.primaryButtonLabel}>Edit Profile</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => clerk.signOut()}>
        <Text style={styles.secondaryButtonLabel}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  },
  card: {
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 20,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  fieldValue: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 18,
  },
  statValue: {
    color: palette.text,
    fontSize: 26,
    fontWeight: "800",
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: palette.accentStrong,
    minHeight: 50,
  },
  primaryButtonLabel: {
    color: "#fffaf4",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    minHeight: 50,
  },
  secondaryButtonLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
