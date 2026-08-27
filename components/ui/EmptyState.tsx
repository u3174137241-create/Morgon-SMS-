import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { Button } from "./Button";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}

export function EmptyState({ icon = "search-outline", title, message, ctaLabel, onPressCta }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSunken }]}>
        <Ionicons name={icon} size={26} color={colors.textSecondary} />
      </View>
      <Text variant="title3" style={{ marginTop: spacing.md, textAlign: "center" }}>
        {title}
      </Text>
      <Text
        variant="callout"
        color="secondary"
        style={{ marginTop: spacing.xxs, textAlign: "center", maxWidth: 280 }}
      >
        {message}
      </Text>
      {ctaLabel && onPressCta ? (
        <Button label={ctaLabel} onPress={onPressCta} style={{ marginTop: spacing.lg, alignSelf: "stretch" }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
