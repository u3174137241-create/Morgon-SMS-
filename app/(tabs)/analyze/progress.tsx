import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";
import { draftListingStore } from "@/lib/draftListingStore";
import { runAnalysis, AnalysisError } from "@/services/analysisService";
import { usageService } from "@/services/usageService";

const STEPS = [
  "Läser annonsen",
  "Identifierar bilspecifikationer",
  "Bedömer prisnivån",
  "Kontrollerar riskindikatorer",
  "Sammanställer rekommendation",
];

const STEP_INTERVAL_MS = 550;

export default function AnalysisProgress() {
  const { colors } = useTheme();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setCompletedSteps(0);

    const stepTimer = setInterval(() => {
      setCompletedSteps((prev) => (prev < STEPS.length ? prev + 1 : prev));
    }, STEP_INTERVAL_MS);

    const minDisplayTime = new Promise((resolve) => setTimeout(resolve, STEP_INTERVAL_MS * STEPS.length));

    (async () => {
      try {
        const listing = draftListingStore.get();
        const [analysis] = await Promise.all([runAnalysis(listing), minDisplayTime]);
        await usageService.recordAnalysisUsed();
        if (cancelled) return;
        clearInterval(stepTimer);
        setCompletedSteps(STEPS.length);
        router.replace(`/result/${analysis.id}`);
      } catch (e) {
        if (cancelled) return;
        clearInterval(stepTimer);
        const message = e instanceof AnalysisError ? e.message : "Något gick fel. Försök igen.";
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
  }, [attempt]);

  if (error) {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: colors.riskBg }]}>
            <Ionicons name="warning-outline" size={26} color={colors.risk} />
          </View>
          <Text variant="title3" style={{ marginTop: spacing.md, textAlign: "center" }}>
            Vi kunde inte slutföra analysen
          </Text>
          <Text variant="callout" color="secondary" style={{ marginTop: spacing.xxs, textAlign: "center" }}>
            {error}
          </Text>
          <Button
            label="Försök igen"
            onPress={() => setAttempt((a) => a + 1)}
            style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
          />
          <Button label="Avbryt" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.xs, alignSelf: "stretch" }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="title2" style={{ marginBottom: spacing.xl }}>
          Analyserar bilen
        </Text>
        <View style={{ alignSelf: "stretch", gap: spacing.md }}>
          {STEPS.map((step, i) => {
            const done = i < completedSteps;
            const active = i === completedSteps;
            return (
              <View key={step} style={styles.stepRow}>
                <Ionicons
                  name={done ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={done ? colors.good : active ? colors.textPrimary : colors.textTertiary}
                />
                <Text variant="body" color={done ? "primary" : active ? "primary" : "tertiary"}>
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
