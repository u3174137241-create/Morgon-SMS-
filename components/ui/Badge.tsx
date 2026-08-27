import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing } from "@/lib/constants/spacing";

export type BadgeTone = "good" | "warn" | "risk" | "neutral";

interface Props {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = "neutral" }: Props) {
  const { colors } = useTheme();
  const toneMap: Record<BadgeTone, { bg: string; fg: string }> = {
    good: { bg: colors.goodBg, fg: colors.good },
    warn: { bg: colors.warnBg, fg: colors.warn },
    risk: { bg: colors.riskBg, fg: colors.risk },
    neutral: { bg: colors.surfaceSunken, fg: colors.textSecondary },
  };
  const t = toneMap[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text variant="caption" style={{ color: t.fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: "flex-start",
  },
});
