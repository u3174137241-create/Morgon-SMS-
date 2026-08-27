import React, { useCallback } from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { usePremium } from "@/hooks/usePremium";
import { spacing } from "@/lib/constants/spacing";
import { isSupabaseConfigured } from "@/services/supabaseClient";

export default function Profile() {
  const { colors } = useTheme();
  const { isPremium, remaining, reload } = usePremium();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <Screen scroll>
      <Text variant="title1" style={{ marginBottom: spacing.lg }}>
        Profil
      </Text>

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceSunken }]}>
            <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
          </View>
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <Text variant="headline">{isSupabaseConfigured ? "Mitt konto" : "Demo-läge"}</Text>
            <Text variant="footnote" color="secondary">
              {isSupabaseConfigured ? "Inloggad" : "Ingen backend konfigurerad ännu"}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.rowBetween}>
          <View>
            <Text variant="headline">Abonnemang</Text>
            <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
              {isPremium ? "Premium aktivt" : `${remaining} analys${remaining === 1 ? "" : "er"} kvar denna månad`}
            </Text>
          </View>
          <Badge label={isPremium ? "Premium" : "Gratis"} tone={isPremium ? "good" : "neutral"} />
        </View>
        {!isPremium && (
          <Button label="Uppgradera till Premium" onPress={() => router.push("/paywall")} style={{ marginTop: spacing.md }} />
        )}
      </Card>

      <Card padded={false} style={{ marginBottom: spacing.md }}>
        <SettingsRow icon="options-outline" label="Inställningar" onPress={() => {}} />
        <Divider />
        <SettingsRow icon="shield-outline" label="Integritetspolicy" onPress={() => router.push("/legal/privacy")} />
        <Divider />
        <SettingsRow icon="document-text-outline" label="Villkor" onPress={() => router.push("/legal/terms")} />
        <Divider />
        <SettingsRow
          icon="help-buoy-outline"
          label="Support"
          onPress={() => Linking.openURL("mailto:support@bilkoll.se")}
          last
        />
      </Card>

      <Text variant="caption" color="tertiary" style={{ textAlign: "center", marginTop: spacing.lg }}>
        Bilkoll · v1.0.0
      </Text>
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.settingsRow, last ? undefined : undefined]}>
      <Ionicons name={icon} size={19} color={colors.textSecondary} />
      <Text variant="body" style={{ flex: 1, marginLeft: spacing.sm }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
});
