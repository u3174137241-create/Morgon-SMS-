import { useFonts, Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getApiBaseUrl } from "./src/storage";
import { pollAndNotify, requestNotificationPermission, setupAndroidChannel } from "./src/notifications";
import { colors } from "./src/theme";
import { TabBar, type TabKey } from "./src/components/TabBar";
import { ConnectScreen } from "./src/screens/ConnectScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LeadsScreen } from "./src/screens/LeadsScreen";
import { NotisScreen } from "./src/screens/NotisScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});

const POLL_INTERVAL_MS = 60_000;

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [connected, setConnected] = useState<boolean | null>(null); // null = checking
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [notifBadge, setNotifBadge] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getApiBaseUrl().then((url) => setConnected(!!url));
  }, []);

  useEffect(() => {
    if (fontsLoaded && connected !== null) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, connected]);

  const runPoll = useCallback(async () => {
    try {
      const newCount = await pollAndNotify();
      if (newCount > 0) setNotifBadge((n) => n + newCount);
    } catch {
      // Silent — polling failures (server unreachable, etc.) shouldn't interrupt the app.
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    setupAndroidChannel();
    requestNotificationPermission();
    runPoll();
    pollTimer.current = setInterval(runPoll, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") runPoll();
    });

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      sub.remove();
    };
  }, [connected, runPoll]);

  if (!fontsLoaded || connected === null) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {connected ? (
        <MainApp tab={tab} setTab={setTab} notifBadge={notifBadge} clearBadge={() => setNotifBadge(0)} onDisconnect={() => setConnected(false)} />
      ) : (
        <ConnectScreen onConnected={() => setConnected(true)} />
      )}
    </SafeAreaProvider>
  );
}

function MainApp({
  tab,
  setTab,
  notifBadge,
  clearBadge,
  onDisconnect,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  notifBadge: number;
  clearBadge: () => void;
  onDisconnect: () => void;
}) {
  const insets = useSafeAreaInsets();

  const change = (t: TabKey) => {
    if (t === "notiser") clearBadge();
    setTab(t);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "leads" && <LeadsScreen />}
        {tab === "notiser" && <NotisScreen />}
        {tab === "settings" && <SettingsScreen onDisconnect={onDisconnect} />}
      </View>
      <TabBar active={tab} onChange={change} badge={notifBadge} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { flex: 1 },
});
