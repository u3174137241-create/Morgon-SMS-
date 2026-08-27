import React, { useRef, useState } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

const ONBOARDED_KEY = "bilkoll.onboarded.v1";

const SLIDES = [
  {
    icon: "car-sport-outline" as const,
    title: "Är bilen värd pengarna?",
    body: "Analysera en bilannons på några sekunder och få ett tydligt beslutsunderlag innan du köper.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Undvik dyra misstag.",
    body: "Se prisnivå, varningssignaler, förhandlingspotential och vad du bör kontrollera.",
  },
  {
    icon: "link-outline" as const,
    title: "Klistra in en annons. Få svaret.",
    body: "Länk, screenshots eller egna uppgifter — du väljer. Vi sköter analysen.",
  },
];

export default function Onboarding() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, "true");
    router.replace("/(tabs)/analyze");
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    } else {
      finish();
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSunken }]}>
              <Ionicons name={slide.icon} size={30} color={colors.textPrimary} />
            </View>
            <Text variant="title1" style={styles.title}>
              {slide.title}
            </Text>
            <Text variant="body" color="secondary" style={styles.body}>
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.tint : colors.border, width: i === index ? 18 : 6 },
              ]}
            />
          ))}
        </View>
        <Button
          label={index === SLIDES.length - 1 ? "Analysera min första bil" : "Fortsätt"}
          onPress={goNext}
        />
        {index < SLIDES.length - 1 && (
          <Button label="Hoppa över" variant="ghost" onPress={finish} style={{ marginTop: spacing.xs }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  title: { textAlign: "center", marginBottom: spacing.sm },
  body: { textAlign: "center", maxWidth: 300 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xxs, marginBottom: spacing.lg },
  dot: { height: 6, borderRadius: 3 },
});
