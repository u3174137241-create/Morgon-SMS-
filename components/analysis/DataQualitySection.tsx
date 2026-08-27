import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

interface Props {
  title: string;
  tone: "verified" | "estimate" | "missing";
  items: string[];
}

const CONFIG = {
  verified: { icon: "checkmark-circle-outline" as const, colorKey: "good" as const },
  estimate: { icon: "sparkles-outline" as const, colorKey: "textSecondary" as const },
  missing: { icon: "help-circle-outline" as const, colorKey: "warn" as const },
};

/**
 * Separerar "Från annonsen" / "AI-bedömning" / "Saknas" (kap. 14) — skapar
 * förtroende genom att aldrig blanda ihop verifierad data med uppskattning.
 */
export function DataQualitySection({ title, tone, items }: Props) {
  const { colors } = useTheme();
  if (items.length === 0) return null;
  const cfg = CONFIG[tone];
  const iconColor = tone === "verified" ? colors.good : tone === "missing" ? colors.warn : colors.textSecondary;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name={cfg.icon} size={16} color={iconColor} />
        <Text variant="subhead" color="secondary" style={{ marginLeft: spacing.xxs }}>
          {title}
        </Text>
      </View>
      <View style={styles.items}>
        {items.map((item, idx) => (
          <Text key={idx} variant="body">
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  items: { gap: spacing.xxs },
});
