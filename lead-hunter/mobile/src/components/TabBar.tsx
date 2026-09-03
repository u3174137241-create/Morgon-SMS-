import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, spacing } from "../theme";

export type TabKey = "dashboard" | "leads" | "notiser" | "settings";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Översikt", icon: "◈" },
  { key: "leads", label: "Leads", icon: "◇" },
  { key: "notiser", label: "Notiser", icon: "♦" },
  { key: "settings", label: "Inställningar", icon: "◆" },
];

export function TabBar({ active, onChange, badge }: { active: TabKey; onChange: (t: TabKey) => void; badge?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={styles.tab}>
            <View>
              <Text style={[styles.icon, isActive && styles.iconActive]}>{t.icon}</Text>
              {t.key === "notiser" && badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  icon: { fontSize: 18, color: colors.muted },
  iconActive: { color: colors.gold },
  label: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.muted },
  labelActive: { color: colors.ink, fontFamily: fonts.sansSemi },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: colors.gold,
    borderRadius: 999,
    minWidth: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 9, fontFamily: fonts.sansBold },
});
