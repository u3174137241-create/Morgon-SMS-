import React from "react";
import { ScrollView, View, ViewProps, StyleSheet } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

interface Props extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
}

/** Standardcontainer för skärmar: rätt bakgrund, safe area, valfri scroll. */
export function Screen({ scroll = false, padded = true, edges = ["top", "bottom"], style, children, ...rest }: Props) {
  const { colors } = useTheme();
  const content = padded ? styles.padded : undefined;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={edges}>
        <ScrollView
          contentContainerStyle={[content, style as object]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={edges}>
      <View style={[styles.flex, content, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: spacing.lg },
});
