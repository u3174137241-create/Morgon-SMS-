import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { Button } from "../components/Button";
import { NotifItem } from "../components/NotifItem";
import { PanelCard } from "../components/PanelCard";
import { StatCard } from "../components/StatCard";
import { colors, fonts, spacing } from "../theme";
import type { HealthStatus, LeadStats, NotificationRecord, SearchRun, SourceRecord } from "../types";

export function DashboardScreen() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [runs, setRuns] = useState<SearchRun[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [notifs, setNotifs] = useState<NotificationRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, h, r, src, n] = await Promise.all([
        api.stats(),
        api.health(),
        api.searchRuns(),
        api.sources(),
        api.notifications(5),
      ]);
      setStats(s);
      setHealth(h);
      setRuns(r.slice(0, 5));
      setSources(src);
      setNotifs(n);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Kunde inte hämta data");
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

  const onTrigger = useCallback(async () => {
    setTriggering(true);
    try {
      await api.triggerSearch();
      setTimeout(load, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTimeout(() => setTriggering(false), 3000);
    }
  }, [load]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Översikt</Text>
          <Text style={styles.subtitle}>Allt du behöver för att hitta rätt leads.</Text>
        </View>
        <Button variant="gold" onPress={onTrigger} loading={triggering}>
          ✦ Sök nu
        </Button>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {health ? (
        <Text style={styles.status}>
          AI: {health.aiClient} · Telegram: {health.telegramConfigured ? "på" : "av"}
          {health.dryRun ? " · DRY_RUN" : ""}
          {health.searching ? " · 🔍 söker just nu…" : ""}
        </Text>
      ) : null}

      <View style={styles.statGrid}>
        <StatCard value={stats?.hotLeads ?? "–"} label="Hot leads" gold />
        <StatCard value={stats?.warmLeads ?? "–"} label="Warm leads" />
        <StatCard value={stats?.leadsToday ?? "–"} label="Leads idag" />
        <StatCard value={stats?.leadsThisWeek ?? "–"} label="Denna vecka" />
        <StatCard value={stats?.rejected ?? "–"} label="Avvisade" muted />
        <StatCard value={stats?.duplicates ?? "–"} label="Dubbletter" muted />
      </View>

      <PanelCard title="Källor">
        {sources.length === 0 ? (
          <Text style={styles.empty}>Inga källor har körts ännu.</Text>
        ) : (
          sources.map((s) => (
            <View key={s.id} style={styles.sourceRow}>
              <Text style={styles.sourceName}>{s.name}</Text>
              <Text style={styles.sourceStat}>
                {s.quality} · {s.successCount} OK · {s.errorCount} fel
              </Text>
            </View>
          ))
        )}
      </PanelCard>

      <PanelCard title="Senaste sökningar">
        {runs.length === 0 ? (
          <Text style={styles.empty}>Inga sökningar körda ännu.</Text>
        ) : (
          runs.map((r) => (
            <View key={r.id} style={styles.runRow}>
              <Text style={styles.runDate}>{new Date(r.startedAt).toLocaleString("sv-SE")}</Text>
              <Text style={styles.runStats}>
                {r.status} · {r.leadsAccepted} accepterade · {r.duplicates} dubbletter · {r.errors} fel
              </Text>
            </View>
          ))
        )}
      </PanelCard>

      <PanelCard title="Senaste notiser">
        {notifs.length === 0 ? <Text style={styles.empty}>Inga notiser ännu.</Text> : notifs.map((n) => <NotifItem key={n.id} n={n} />)}
      </PanelCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm, gap: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  status: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, marginBottom: spacing.md },
  error: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.fail, marginBottom: spacing.sm },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.sans, fontStyle: "italic", fontSize: 12.5, color: colors.muted },
  sourceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  sourceName: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  sourceStat: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.inkSoft },
  runRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  runDate: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.ink },
  runStats: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.inkSoft, marginTop: 1 },
});
