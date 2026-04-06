import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MessageBlock } from "@/components/state-block";
import { palette } from "@/lib/theme";
import type { CurrentUser, ProfileUpdateInput } from "@/lib/types";

export function ProfileEditor({
  user,
  isSaving,
  saveError,
  onSave,
}: {
  user: CurrentUser;
  isSaving: boolean;
  saveError: string | null;
  onSave: (input: ProfileUpdateInput) => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [major, setMajor] = useState(user.major ?? "");
  const [gradYear, setGradYear] = useState(user.gradYear?.toString() ?? "");
  const [interestsInput, setInterestsInput] = useState(user.interests.join(", "));

  function submit() {
    onSave(
      buildProfileUpdateInput({
        displayName,
        major,
        gradYear,
        interestsInput,
      }),
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Profile</Text>
        <Text style={styles.heroTitle}>Tune the signals that shape your feed.</Text>
        <Text style={styles.heroBody}>
          Display name, major, grad year, and interests all travel straight into the
          profile behavior already defined for Social OSU.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Field label="Email">
          <Text style={styles.readonlyValue}>{user.email}</Text>
        </Field>

        <Field label="Display Name">
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
        </Field>

        <Field label="Major">
          <TextInput
            value={major}
            onChangeText={setMajor}
            placeholder="Major"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
        </Field>

        <Field label="Graduation Year">
          <TextInput
            value={gradYear}
            onChangeText={setGradYear}
            placeholder="Graduation year"
            placeholderTextColor={palette.textMuted}
            keyboardType="number-pad"
            style={styles.input}
          />
        </Field>

        <Field label="Interests">
          <TextInput
            value={interestsInput}
            onChangeText={setInterestsInput}
            placeholder="Comma-separated interests"
            placeholderTextColor={palette.textMuted}
            style={[styles.input, styles.multilineInput]}
            multiline
          />
        </Field>

        {saveError ? (
          <MessageBlock title="Save failed" detail={saveError} tone="danger" />
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={[styles.primaryButton, isSaving ? styles.primaryButtonDisabled : null]}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonLabel}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function parseInterests(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildProfileUpdateInput({
  displayName,
  major,
  gradYear,
  interestsInput,
}: {
  displayName: string;
  major: string;
  gradYear: string;
  interestsInput: string;
}): ProfileUpdateInput {
  return {
    displayName: displayName.trim() || null,
    major: major.trim() || null,
    gradYear: gradYear.trim() ? Number.parseInt(gradYear, 10) : null,
    interests: parseInterests(interestsInput),
  };
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
  kicker: {
    color: palette.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 33,
  },
  heroBody: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    gap: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  readonlyValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#fffaf4",
    color: palette.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    minHeight: 50,
    backgroundColor: palette.accentStrong,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonLabel: {
    color: "#fffaf4",
    fontSize: 15,
    fontWeight: "700",
  },
});
