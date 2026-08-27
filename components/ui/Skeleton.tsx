import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle, Easing } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { radii } from "@/lib/constants/spacing";

interface Props {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
}

/** Diskret shimmer-placeholder för laddningstillstånd. */
export function Skeleton({ width = "100%", height = 16, style }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, backgroundColor: colors.surfaceSunken, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.sm },
});
