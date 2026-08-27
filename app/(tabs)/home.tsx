import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnalysisListItem } from "@/components/analysis/AnalysisListItem";
import { useAnalyses } from "@/hooks/useAnalyses";
import { spacing } from "@/lib/constants/spacing";

export default function Home() {
  const { analyses, reload } = useAnalyses();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text variant="display">Är den här bilen värd pengarna?</Text>
        <Text variant="body" color="secondary" style={{ marginTop: spacing.sm }}>
          Klistra in en annons eller ladda upp bilder.
        </Text>
        <Button
          label="Analysera bil"
          onPress={() => router.push("/(tabs)/analyze")}
          style={{ marginTop: spacing.lg }}
        />
      </View>

      <View style={styles.section}>
        <Text variant="title3" style={{ marginBottom: spacing.sm }}>
          Senaste analyser
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
            {analyses.slice(0, 4).map((a) => (
              <AnalysisListItem key={a.id} analysis={a} onPress={() => router.push(`/result/${a.id}`)} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.xxl, marginTop: spacing.sm },
  section: { marginBottom: spacing.xl },
});
