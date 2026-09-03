import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, spacing } from "../theme";

export function StatCard({ value, label, gold, muted }: { value: number | string; label: string; gold?: boolean; muted?: boolean }) {
  return (
    <View style={[styles.card, gold && styles.gold, muted && styles.muted]}>
      <Text style={[styles.value, gold && styles.valueGold]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "31%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  gold: { backgroundColor: "#fbf3e2", borderColor: colors.goldLight },
  muted: { opacity: 0.8 },
  value: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  valueGold: { color: colors.goldDeep },
  label: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.inkSoft, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.4 },
});
