import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { NotifItem } from "../components/NotifItem";
import { colors, fonts, spacing } from "../theme";
import type { NotificationRecord } from "../types";

export function NotisScreen() {
  const [notifs, setNotifs] = useState<NotificationRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotifs(await api.notifications(50));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Kunde inte hämta notiser");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notiser</Text>
        <Text style={styles.subtitle}>Historik över alla notiser som skickats eller loggats.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={notifs}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        renderItem={({ item }) => <NotifItem n={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Inga notiser ännu. Du får en notis här (och som lokal notis på telefonen, plus via Telegram om det är aktiverat) när ett hett
            eller varmt lead hittas.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingTop: spacing.lg },
  headerRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  error: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.fail, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { fontFamily: fonts.sans, fontStyle: "italic", fontSize: 12.5, color: colors.muted, padding: spacing.lg, lineHeight: 18 },
});
