import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { typography, TypographyVariant } from "@/lib/constants/typography";
import { useTheme } from "@/hooks/useTheme";

type ColorRole = "primary" | "secondary" | "tertiary" | "inverse" | "good" | "warn" | "risk";

interface Props extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorRole;
}

/** Textkomponent kopplad till designsystemets typografiska nivåer och tema. */
export function Text({ variant = "body", color = "primary", style, ...rest }: Props) {
  const { colors } = useTheme();
  const colorMap: Record<ColorRole, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    inverse: colors.textInverse,
    good: colors.good,
    warn: colors.warn,
    risk: colors.risk,
  };
  return <RNText style={[typography[variant], { color: colorMap[color] }, style]} {...rest} />;
}
