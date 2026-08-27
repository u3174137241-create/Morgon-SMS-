import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing } from "@/lib/constants/spacing";
import type { Verdict } from "@/types/analysis";
import { VERDICT_LABEL } from "@/types/analysis";

const ICON: Record<Verdict, keyof typeof Ionicons.glyphMap> = {
  good_buy: "checkmark-circle",
  caution: "alert-circle",
  avoid: "close-circle",
};

export function VerdictBanner({ verdict, confidence }: { verdict: Verdict; confidence: number }) {
  const { colors } = useTheme();
  const tone =
    verdict === "good_buy"
      ? { fg: colors.good, bg: colors.goodBg }
      : verdict === "caution"
        ? { fg: colors.warn, bg: colors.warnBg }
        : { fg: colors.risk, bg: colors.riskBg };

  return (
    <View style={[styles.wrap, { backgroundColor: tone.bg }]}>
      <Ionicons name={ICON[verdict]} size={28} color={tone.fg} />
      <Text variant="title1" style={{ color: tone.fg, marginTop: spacing.xs }}>
        {VERDICT_LABEL[verdict].toUpperCase()}
      </Text>
      <Text variant="footnote" color="secondary" style={{ marginTop: spacing.xxs }}>
        Tillförlitlighet {Math.round(confidence * 100)} %
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
});
