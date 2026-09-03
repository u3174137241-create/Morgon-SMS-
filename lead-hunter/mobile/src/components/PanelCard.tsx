import React, { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, spacing } from "../theme";

export function PanelCard({ title, right, children }: PropsWithChildren<{ title?: string; right?: React.ReactNode }>) {
  return (
    <View style={styles.panel}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 17, color: colors.ink },
});
