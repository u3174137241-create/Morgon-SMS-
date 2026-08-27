import React from "react";
import { View, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";
import type { AnalysisResult } from "@/types/analysis";
import { VERDICT_LABEL } from "@/types/analysis";
import { formatSEK, formatMil } from "@/utils/currency";
import { formatDate, carTitle } from "@/utils/format";

export function AnalysisListItem({ analysis, onPress }: { analysis: AnalysisResult; onPress: () => void }) {
  const { colors } = useTheme();
  const { listing } = analysis;
  const tone =
    analysis.verdict === "good_buy" ? colors.good : analysis.verdict === "caution" ? colors.warn : colors.risk;

  const details = [
    listing.modelYear ? String(listing.modelYear) : null,
    listing.mileageKm ? formatMil(listing.mileageKm) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text variant="headline">{carTitle(listing.make, listing.model)}</Text>
        <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
          {details}
          {details && listing.price ? " • " : ""}
          {listing.price ? formatSEK(listing.price) : ""}
        </Text>
        <Text variant="caption" color="tertiary" style={{ marginTop: spacing.xs }}>
          {formatDate(analysis.createdAt)}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.dot, { backgroundColor: tone }]} />
        <Text variant="subhead" style={{ color: tone }}>
          {VERDICT_LABEL[analysis.verdict]}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, marginLeft: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
