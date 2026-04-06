import type { CSSProperties } from "react";
import { Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palette } from "@/lib/theme";

export function SignInScreen() {
  if (Platform.OS === "web") {
    const { SignIn } = require("@clerk/expo/web") as typeof import("@clerk/expo/web");

    return (
      <div style={webStyles.page}>
        <div style={webStyles.card}>
          <SignIn routing="hash" />
        </div>
      </div>
    );
  }

  return <NativeAuthScreen mode="signIn" title="Welcome back" />;
}

export function SignUpScreen() {
  if (Platform.OS === "web") {
    const { SignUp } = require("@clerk/expo/web") as typeof import("@clerk/expo/web");

    return (
      <div style={webStyles.page}>
        <div style={webStyles.card}>
          <SignUp routing="hash" />
        </div>
      </div>
    );
  }

  return <NativeAuthScreen mode="signUp" title="Join Social OSU" />;
}

function NativeAuthScreen({
  mode,
  title,
}: {
  mode: "signIn" | "signUp";
  title: string;
}) {
  const { AuthView } = require("@clerk/expo/native") as typeof import("@clerk/expo/native");

  return (
    <LinearGradient
      colors={["#fff4e6", "#f6f1e7", "#efe7d9"]}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Social OSU Mobile</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Native Clerk authentication uses a development build on iOS and Android.
          </Text>
        </View>

        <View style={styles.authCard}>
          <AuthView mode={mode} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  header: {
    gap: 10,
    paddingTop: 12,
  },
  kicker: {
    color: palette.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  authCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    marginTop: 24,
  },
});

const webStyles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,244,230,1) 0%, rgba(246,241,231,1) 55%, rgba(239,231,217,1) 100%)",
    padding: 24,
  },
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 28,
    padding: 16,
    border: "1px solid #e6d8bf",
  },
};
