import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { PremiumGate } from "@/components/ui/PremiumGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { usePremium } from "@/hooks/usePremium";
import { useAnalyses } from "@/hooks/useAnalyses";
import { spacing } from "@/lib/constants/spacing";
import { formatSEK, formatMil } from "@/utils/currency";
import { carTitle } from "@/utils/format";
import { computeValueScore, riskSummaryLabel } from "@/features/analysis/scoring";
import { VERDICT_LABEL } from "@/types/analysis";

const MAX_SELECTION = 3;

export default function Compare() {
  const { colors } = useTheme();
  const { isPremium } = usePremium();
  const { analyses, reload } = useAnalyses();
  const [selected, setSelected] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  };

  const selectedAnalyses = useMemo(
    () => analyses.filter((a) => selected.includes(a.id)),
    [analyses, selected]
  );

  const hasDemoSelected = selectedAnalyses.some((a) => a.isDemo);
  const best = useMemo(() => {
    if (selectedAnalyses.length < 2) return null;
    return [...selectedAnalyses].sort((a, b) => computeValueScore(b) - computeValueScore(a))[0];
  }, [selectedAnalyses]);

  if (analyses.length < 2) {
    return (
      <Screen>
        <Text variant="title1" style={{ marginBottom: spacing.lg }}>
          Jämför bilar
        </Text>
        <EmptyState
          icon="git-compare-outline"
          title="Inget att jämföra ännu"
          message="Analysera minst två bilar för att kunna jämföra dem sida vid sida."
          ctaLabel="Analysera bil"
          onPressCta={() => router.push("/(tabs)/analyze")}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title1" style={{ marginBottom: spacing.xxs }}>
        Jämför bilar
      </Text>
      <Text variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
        Välj upp till {MAX_SELECTION} analyser att jämföra.
      </Text>

      <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
        {analyses.map((a) => {
          const active = selected.includes(a.id);
          return (
            <Pressable key={a.id} onPress={() => toggle(a.id)}>
              <Card
                style={[
                  styles.pickRow,
                  active ? { borderColor: colors.tint, borderWidth: 1.5 } : undefined,
                ]}
              >
                <Ionicons
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={active ? colors.tint : colors.textTertiary}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text variant="bodyMedium">{carTitle(a.listing.make, a.listing.model)}</Text>
                  <Text variant="footnote" color="secondary">
                    {a.listing.price != null ? formatSEK(a.listing.price) : "Pris okänt"}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {selectedAnalyses.length >= 2 && (
        <PremiumGate
          locked={!isPremium && !hasDemoSelected}
          title="Jämförelse mellan bilar"
          message="Lås upp sida-vid-sida-jämförelse med prisvärde, risk och förhandlingspotential."
        >
          <Text variant="title3" style={{ marginBottom: spacing.sm }}>
            Jämförelse
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
            <View>
              <View style={styles.tableRow}>
                <Text variant="caption" color="tertiary" style={styles.rowLabel} />
                {selectedAnalyses.map((a) => (
                  <Text key={a.id} variant="subhead" style={styles.cell}>
                    {carTitle(a.listing.make, a.listing.model)}
                  </Text>
                ))}
              </View>
              <Divider inset />
              <CompareRow label="Pris" values={selectedAnalyses.map((a) => (a.listing.price != null ? formatSEK(a.listing.price) : "—"))} />
              <CompareRow label="Miltal" values={selectedAnalyses.map((a) => (a.listing.mileageKm != null ? formatMil(a.listing.mileageKm) : "—"))} />
              <CompareRow label="Årsmodell" values={selectedAnalyses.map((a) => (a.listing.modelYear ? String(a.listing.modelYear) : "—"))} />
              <CompareRow label="Risk" values={selectedAnalyses.map((a) => riskSummaryLabel(a))} />
              <CompareRow
                label="Marknadsvärde"
                values={selectedAnalyses.map((a) =>
                  a.priceAssessment.estimatedMarketMin != null && a.priceAssessment.estimatedMarketMax != null
                    ? `${formatSEK(a.priceAssessment.estimatedMarketMin)}–${formatSEK(a.priceAssessment.estimatedMarketMax)}`
                    : "Osäker"
                )}
              />
              <CompareRow
                label="Förhandlingsbud"
                values={selectedAnalyses.map((a) => (a.negotiation.recommendedOffer != null ? formatSEK(a.negotiation.recommendedOffer) : "—"))}
              />
              <CompareRow label="Bedömning" values={selectedAnalyses.map((a) => VERDICT_LABEL[a.verdict])} />
              <CompareRow label="Prisvärde" values={selectedAnalyses.map((a) => computeValueScore(a).toFixed(1))} />
            </View>
          </ScrollView>

          {best && (
            <Card>
              <Text variant="headline">Bästa köpet: {carTitle(best.listing.make, best.listing.model)}</Text>
              <Text variant="footnote" color="secondary" style={{ marginTop: spacing.xxs }}>
                Baserat på pris, risk och förhandlingsutrymme bland de valda bilarna.
              </Text>
            </Card>
          )}
        </PremiumGate>
      )}
    </Screen>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <View style={styles.tableRow}>
      <Text variant="footnote" color="secondary" style={styles.rowLabel}>
        {label}
      </Text>
      {values.map((v, idx) => (
        <Text key={idx} variant="subhead" style={styles.cell}>
          {v}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pickRow: { flexDirection: "row", alignItems: "center" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs },
  rowLabel: { width: 110 },
  cell: { width: 120, marginRight: spacing.sm },
});
