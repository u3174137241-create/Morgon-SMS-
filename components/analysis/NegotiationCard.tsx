import React from "react";
import { View, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Divider } from "@/components/ui/Divider";
import { spacing } from "@/lib/constants/spacing";
import type { NegotiationResult } from "@/types/analysis";
import { formatSEK } from "@/utils/currency";

export function NegotiationCard({ negotiation, listedPrice }: { negotiation: NegotiationResult; listedPrice: number | null }) {
  return (
    <Card>
      <View style={styles.row}>
        <Text variant="subhead" color="secondary">
          Annonspris
        </Text>
        <Text variant="bodyMedium">{listedPrice != null ? formatSEK(listedPrice) : "Okänt"}</Text>
      </View>
      <View style={styles.row}>
        <Text variant="subhead" color="secondary">
          Rekommenderat bud
        </Text>
        <Text variant="headline">
          {negotiation.recommendedOffer != null ? formatSEK(negotiation.recommendedOffer) : "—"}
        </Text>
      </View>
      {negotiation.targetPriceMin != null && negotiation.targetPriceMax != null && (
        <View style={styles.row}>
          <Text variant="subhead" color="secondary">
            Rimligt slutpris
          </Text>
          <Text variant="bodyMedium">
            {formatSEK(negotiation.targetPriceMin)} – {formatSEK(negotiation.targetPriceMax)}
          </Text>
        </View>
      )}

      {negotiation.arguments.length > 0 && (
        <>
          <Divider inset />
          <Text variant="subhead" color="secondary" style={{ marginBottom: spacing.xs }}>
            Varför?
          </Text>
          <View style={{ gap: spacing.xs }}>
            {negotiation.arguments.map((arg, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text variant="body" color="tertiary">
                  •
                </Text>
                <Text variant="body" style={{ flex: 1 }}>
                  {arg}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xxs,
  },
  bulletRow: { flexDirection: "row", gap: spacing.xs },
});
