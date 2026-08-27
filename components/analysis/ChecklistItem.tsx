import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, touchTarget } from "@/lib/constants/spacing";

export function ChecklistItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? colors.tint : colors.borderStrong,
            backgroundColor: checked ? colors.tint : "transparent",
          },
        ]}
      >
        {checked && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
      </View>
      <Text
        variant="body"
        color={checked ? "tertiary" : "primary"}
        style={checked ? styles.strike : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.min,
    gap: spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radii.sm - 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  strike: { textDecorationLine: "line-through" },
});
