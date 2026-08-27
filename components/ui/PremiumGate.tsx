import React from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { Text } from "./Text";
import { Button } from "./Button";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

interface Props {
  locked: boolean;
  title: string;
  message: string;
  children: React.ReactNode;
}

/** Diskret, icke-aggressiv paywall-teaser för premiumfunktioner i resultatet. */
export function PremiumGate({ locked, title, message, children }: Props) {
  const { colors } = useTheme();
  if (!locked) return <>{children}</>;

  return (
    <Card>
      <View style={styles.row}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
        <Text variant="headline" style={{ marginLeft: spacing.xs }}>
          {title}
        </Text>
      </View>
      <Text variant="callout" color="secondary" style={{ marginTop: spacing.xxs, marginBottom: spacing.md }}>
        {message}
      </Text>
      <Button label="Lås upp med Premium" variant="secondary" onPress={() => router.push("/paywall")} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
