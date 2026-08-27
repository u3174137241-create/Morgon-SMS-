import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, showBack = false, right }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="title2">{title}</Text>
          {subtitle ? (
            <Text variant="callout" color="secondary" style={{ marginTop: spacing.xxs }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  backButton: { marginRight: spacing.xs, padding: spacing.xxs },
});
