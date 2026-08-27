import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

export function Divider({ inset = false }: { inset?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.line,
        { backgroundColor: colors.border, marginVertical: inset ? spacing.sm : 0 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth * 1.5, width: "100%" },
});
