import React, { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius, spacing } from "../theme";

type Variant = "gold" | "outline" | "plain";

export function Button({
  children,
  onPress,
  variant = "outline",
  disabled,
  loading,
}: PropsWithChildren<{ onPress: () => void; variant?: Variant; disabled?: boolean; loading?: boolean }>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === "gold" && styles.gold,
        variant === "outline" && styles.outline,
        variant === "plain" && styles.plain,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "gold" ? colors.white : colors.gold} />
      ) : (
        <Text style={[styles.label, variant === "gold" && styles.labelGold]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  gold: { backgroundColor: colors.gold },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  plain: { backgroundColor: "transparent" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  labelGold: { color: colors.white },
});
