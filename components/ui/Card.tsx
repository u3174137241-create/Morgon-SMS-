import React from "react";
import { View, ViewProps, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing } from "@/lib/constants/spacing";

interface Props extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
}

/** Diskret, väl avgränsat kort — subtil border, ingen skugga-överdrift. */
export function Card({ onPress, padded = true, style, children, ...rest }: Props) {
  const { colors } = useTheme();
  const base = [
    styles.base,
    padded && styles.padded,
    { backgroundColor: colors.surface, borderColor: colors.border },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, { opacity: pressed ? 0.9 : 1 }]}
        {...(rest as object)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  padded: { padding: spacing.md },
});
