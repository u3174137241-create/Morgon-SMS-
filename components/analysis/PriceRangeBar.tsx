import React from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import { useState } from "react";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing } from "@/lib/constants/spacing";
import { formatSEK, percentDiff } from "@/utils/currency";

interface Props {
  min: number;
  max: number;
  listedPrice: number;
}

/** Minimalistisk visuell prisintervall-indikator med markör för annonspris. */
export function PriceRangeBar({ min, max, listedPrice }: Props) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const span = Math.max(1, max - min);
  const clamped = Math.min(max + span * 0.15, Math.max(min - span * 0.15, listedPrice));
  const domainMin = min - span * 0.15;
  const domainMax = max + span * 0.15;
  const ratio = (clamped - domainMin) / (domainMax - domainMin);

  const diff = percentDiff(listedPrice, (min + max) / 2);
  const diffLabel =
    Math.abs(diff) < 1 ? "I linje med marknadsvärdet" : `${diff > 0 ? "+" : ""}${Math.round(diff)} % mot marknadsvärde`;

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View>
      <View style={styles.labelsRow}>
        <Text variant="caption" color="tertiary">
          {formatSEK(min)}
        </Text>
        <Text variant="caption" color="tertiary">
          {formatSEK(max)}
        </Text>
      </View>
      <View onLayout={onLayout} style={[styles.track, { backgroundColor: colors.chartTrack }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.borderStrong,
              left: `${Math.min(100, Math.max(15, 15))}%`,
            },
          ]}
        />
        {trackWidth > 0 && (
          <View
            style={[
              styles.marker,
              {
                backgroundColor: colors.tint,
                left: Math.min(trackWidth - 3, Math.max(3, ratio * trackWidth - 3)),
              },
            ]}
          />
        )}
      </View>
      <View style={styles.footerRow}>
        <Text variant="subhead">Annonspris {formatSEK(listedPrice)}</Text>
        <Text variant="subhead" color={diff > 3 ? "risk" : diff < -3 ? "good" : "secondary"}>
          {diffLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xxs },
  track: { height: 8, borderRadius: radii.pill, overflow: "visible", justifyContent: "center" },
  fill: { position: "absolute", height: 8, borderRadius: radii.pill, width: "70%" },
  marker: { position: "absolute", width: 6, height: 20, borderRadius: 3, top: -6 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
});
