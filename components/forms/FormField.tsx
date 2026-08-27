import React from "react";
import { TextInput, TextInputProps, View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, touchTarget } from "@/lib/constants/spacing";

interface Props extends TextInputProps {
  label: string;
  optional?: boolean;
}

export function FormField({ label, optional, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text variant="subhead" color="secondary">
          {label}
        </Text>
        {optional && (
          <Text variant="caption" color="tertiary">
            Valfritt
          </Text>
        )}
      </View>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xxs },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget.min,
    fontSize: 16,
  },
});
