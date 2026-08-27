import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, touchTarget } from "@/lib/constants/spacing";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function ChipSelect<T extends string>({ label, options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="subhead" color="secondary" style={{ marginBottom: spacing.xxs }}>
        {label}
      </Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.tint : colors.surface,
                  borderColor: active ? colors.tint : colors.border,
                },
              ]}
            >
              <Text variant="subhead" style={{ color: active ? colors.textInverse : colors.textPrimary }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget.min - 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
