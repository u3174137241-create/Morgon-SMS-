import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/useTheme";

const ONBOARDED_KEY = "bilkoll.onboarded.v1";

export default function Index() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((value) => {
      setOnboarded(value === "true");
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  return <Redirect href={onboarded ? "/(tabs)/home" : "/onboarding"} />;
}
