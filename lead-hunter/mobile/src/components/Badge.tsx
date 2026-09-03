import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { classificationColors, fonts, radius } from "../theme";

export function Badge({ classification, label }: { classification: string; label: string | number }) {
  const c = classificationColors[classification] ?? classificationColors.IGNORE;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontFamily: fonts.sansBold, fontSize: 12 },
});
