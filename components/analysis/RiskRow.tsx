import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";
import type { RiskCategory } from "@/types/analysis";

const LEVEL_LABEL: Record<RiskCategory["level"], string> = {
  low: "Låg",
  medium: "Medel",
  high: "Hög",
  unknown: "Okänd",
};

export function RiskRow({ risk }: { risk: RiskCategory }) {
  const { colors } = useTheme();
  const dot =
    risk.level === "low" ? colors.good : risk.level === "medium" ? colors.warn : risk.level === "high" ? colors.risk : colors.textTertiary;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">{risk.label}</Text>
          {risk.note ? (
            <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
              {risk.note}
            </Text>
          ) : null}
        </View>
      </View>
      <Text variant="subhead" style={{ color: dot }}>
        {LEVEL_LABEL[risk.level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  left: { flexDirection: "row", alignItems: "flex-start", flex: 1, marginRight: spacing.sm, gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
