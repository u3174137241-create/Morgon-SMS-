import React from "react";
import { Pressable, ActivityIndicator, StyleSheet, GestureResponderEvent, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "./Text";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, touchTarget } from "@/lib/constants/spacing";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface Props {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const handlePress = (e: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress(e);
  };

  const bg =
    variant === "primary" ? colors.tint : variant === "secondary" ? colors.surfaceSunken : "transparent";
  const border = variant === "secondary" || variant === "ghost" ? colors.border : "transparent";
  const textColor = variant === "primary" ? colors.textInverse : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityHint={accessibilityHint}
      onPress={isDisabled ? undefined : handlePress}
      style={({ pressed }) => [
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === "primary" ? 0 : StyleSheet.hairlineWidth * 2,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text variant="headline" style={{ color: textColor }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minHeight: touchTarget.min,
  },
  lg: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg },
  md: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md },
});
