import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing } from "../theme";
import type { NotificationRecord } from "../types";

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just nu";
  if (mins < 60) return `${mins} min sedan`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} tim sedan`;
  return `${Math.round(hrs / 24)} dagar sedan`;
}

export function NotifItem({ n }: { n: NotificationRecord }) {
  const icon = !n.success ? "⚠️" : n.type === "DIGEST" ? "📊" : "✦";
  return (
    <View style={[styles.item, !n.success && styles.fail]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.body}>
        <Text style={styles.msg} numberOfLines={4}>
          {n.message}
        </Text>
        <Text style={styles.meta}>
          {timeAgo(n.sentAt)}
          {!n.success ? ` · misslyckades${n.error ? `: ${n.error}` : ""}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    marginBottom: spacing.sm,
  },
  fail: { borderColor: colors.failBorder, backgroundColor: colors.failBg },
  icon: { fontSize: 16 },
  body: { flex: 1 },
  msg: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  meta: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, marginTop: 4 },
});
