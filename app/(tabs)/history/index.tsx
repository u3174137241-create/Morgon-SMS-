import React, { useCallback } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/EmptyState";
import { PremiumGate } from "@/components/ui/PremiumGate";
import { AnalysisListItem } from "@/components/analysis/AnalysisListItem";
import { useAnalyses } from "@/hooks/useAnalyses";
import { usePremium } from "@/hooks/usePremium";
import { spacing } from "@/lib/constants/spacing";

const FREE_HISTORY_LIMIT = 5;

export default function History() {
  const { analyses, reload } = useAnalyses();
  const { isPremium } = usePremium();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const visible = isPremium ? analyses : analyses.slice(0, FREE_HISTORY_LIMIT);
  const hiddenCount = analyses.length - visible.length;

  return (
    <Screen scroll>
      <Text variant="title1" style={{ marginBottom: spacing.lg }}>
        Mina analyser
      </Text>

      {analyses.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Inga analyser ännu"
          message="Analysera din första bil för att se om den är värd pengarna."
          ctaLabel="Analysera bil"
          onPressCta={() => router.push("/(tabs)/analyze")}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {visible.map((a) => (
            <AnalysisListItem key={a.id} analysis={a} onPress={() => router.push(`/result/${a.id}`)} />
          ))}
        </View>
      )}

      {hiddenCount > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <PremiumGate
            locked
            title="Obegränsad historik"
            message={`${hiddenCount} till${hiddenCount === 1 ? "" : "a"} analys${hiddenCount === 1 ? "" : "er"} väntar. Lås upp Premium för att se hela din historik.`}
          >
            <View />
          </PremiumGate>
        </View>
      )}
    </Screen>
  );
}
