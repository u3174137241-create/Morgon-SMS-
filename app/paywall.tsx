import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { usePremium } from "@/hooks/usePremium";
import { spacing } from "@/lib/constants/spacing";

const FEATURES = [
  "Obegränsade bilanalyser",
  "Avancerad prisanalys och riskbedömning",
  "Förhandlingsläge med färdiga argument",
  "Jämför flera bilar sida vid sida",
  "Obegränsad historik",
];

const PLANS = [
  { id: "monthly", label: "Månadsvis", price: "49 kr/mån", note: null },
  { id: "yearly", label: "Årsvis", price: "349 kr/år", note: "Motsvarar 29 kr/mån" },
] as const;

export default function Paywall() {
  const { colors } = useTheme();
  const { activatePremium } = usePremium();
  const [plan, setPlan] = useState<(typeof PLANS)[number]["id"]>("yearly");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    // I produktion: initiera App Store/Stripe-köp här, aktivera premium
    // efter bekräftad kvitto-validering server-side (Supabase Edge Function).
    await new Promise((r) => setTimeout(r, 700));
    await activatePremium();
    setLoading(false);
    router.back();
  };

  return (
    <Screen scroll edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <View style={{ width: 24 }} />
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Stäng">
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <Text variant="title1" style={{ marginTop: spacing.md }}>
        Bilkoll Premium
      </Text>
      <Text variant="body" color="secondary" style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}>
        En bilaffär kan kosta 100 000+ kr. En analys kostar mindre än en tankning.
      </Text>

      <Card style={{ marginBottom: spacing.xl }}>
        {FEATURES.map((feature, idx) => (
          <View key={feature} style={[styles.featureRow, idx > 0 ? { marginTop: spacing.sm } : undefined]}>
            <Ionicons name="checkmark" size={18} color={colors.good} />
            <Text variant="body" style={{ marginLeft: spacing.sm, flex: 1 }}>
              {feature}
            </Text>
          </View>
        ))}
      </Card>

      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        {PLANS.map((p) => {
          const active = plan === p.id;
          return (
            <Pressable key={p.id} onPress={() => setPlan(p.id)}>
              <Card style={active ? { borderColor: colors.tint, borderWidth: 1.5 } : undefined}>
                <View style={styles.planRow}>
                  <View>
                    <Text variant="bodyMedium">{p.label}</Text>
                    {p.note && (
                      <Text variant="footnote" color="secondary">
                        {p.note}
                      </Text>
                    )}
                  </View>
                  <View style={styles.planRight}>
                    <Text variant="headline">{p.price}</Text>
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={active ? colors.tint : colors.textTertiary}
                    />
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Button label="Fortsätt" onPress={handleSubscribe} loading={loading} />
      <Text variant="caption" color="tertiary" style={{ textAlign: "center", marginTop: spacing.md }}>
        Avbryt när du vill. Betalning hanteras säkert via App Store.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  featureRow: { flexDirection: "row", alignItems: "center" },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
