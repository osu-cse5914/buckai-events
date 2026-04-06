import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette } from "@/lib/theme";

type Option<T extends string> = {
  label: string;
  value: T;
};

export function FilterChips<T extends string>({
  options,
  selectedValue,
  onChange,
}: {
  options: readonly Option<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === selectedValue;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected ? styles.chipSelected : null]}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.accentStrong,
  },
  label: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  labelSelected: {
    color: "#fffaf4",
  },
});
