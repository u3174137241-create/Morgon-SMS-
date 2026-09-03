import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { Button } from "../components/Button";
import { PanelCard } from "../components/PanelCard";
import { requestNotificationPermission } from "../notifications";
import { clearConnection, getApiBaseUrl } from "../storage";
import { colors, fonts, radius, spacing } from "../theme";
import type { Category, LocationConfig, Settings } from "../types";

export function SettingsScreen({ onDisconnect }: { onDisconnect: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, c, l, url] = await Promise.all([api.settings(), api.categories(), api.locations(), getApiBaseUrl()]);
    setSettings(s);
    setCategories(c);
    setLocations(l);
    setBaseUrl(url);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      Alert.alert("Sparat", "Inställningarna har sparats.");
    } catch (err: any) {
      Alert.alert("Fel", err.message);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const toggleCategory = useCallback(async (id: string, enabled: boolean) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
    await api.setCategoryEnabled(id, enabled);
  }, []);

  const toggleLocation = useCallback(async (id: string, enabled: boolean) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, enabled } : l)));
    await api.setLocationEnabled(id, enabled);
  }, []);

  const askNotifPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setNotifStatus(granted ? "granted" : "denied");
  }, []);

  if (!settings) {
    return (
      <View style={styles.screen}>
        <Text style={styles.subtitle}>Laddar…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Inställningar</Text>
      <Text style={styles.subtitle}>Kategorier, platser, tröskelvärden och notiser.</Text>

      <PanelCard title="Server">
        <Text style={styles.serverUrl}>{baseUrl}</Text>
        <Button
          variant="outline"
          onPress={async () => {
            await clearConnection();
            onDisconnect();
          }}
        >
          Byt server
        </Button>
      </PanelCard>

      <PanelCard title="Telefonnotiser">
        <Text style={styles.hint}>
          Lokala notiser på den här telefonen när appen är öppen. Telegram (om aktiverat nedan) fungerar även när appen är stängd.
        </Text>
        <Button variant="outline" onPress={askNotifPermission}>
          {notifStatus === "granted" ? "Notiser tillåtna ✓" : "Tillåt notiser"}
        </Button>
      </PanelCard>

      <PanelCard title="Allmänt">
        <Field label="Max lead-ålder (dagar)">
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(settings.maxLeadAgeDays)}
            onChangeText={(v) => setSettings({ ...settings, maxLeadAgeDays: Number(v) || 0 })}
          />
        </Field>
        <Field label="Minsta score för notis">
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(settings.minScoreNotify)}
            onChangeText={(v) => setSettings({ ...settings, minScoreNotify: Number(v) || 0 })}
          />
        </Field>
        <Field label="Sökintervall (timmar)">
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(settings.searchIntervalHours)}
            onChangeText={(v) => setSettings({ ...settings, searchIntervalHours: Number(v) || 0 })}
          />
        </Field>
        <Field label="Sökintensitet">
          <View style={styles.segment}>
            {(["LOW", "MEDIUM", "HIGH"] as const).map((i) => (
              <Button
                key={i}
                variant={settings.searchIntensity === i ? "gold" : "outline"}
                onPress={() => setSettings({ ...settings, searchIntensity: i })}
              >
                {i}
              </Button>
            ))}
          </View>
        </Field>
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Telegram-notiser aktiverade</Text>
          <Switch
            value={settings.telegramEnabled}
            onValueChange={(v) => setSettings({ ...settings, telegramEnabled: v })}
            trackColor={{ true: colors.gold, false: colors.border }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.border}
          />
        </View>
        <Button variant="gold" onPress={save} loading={saving}>
          Spara inställningar
        </Button>
      </PanelCard>

      <PanelCard title="Kategorier">
        {categories.map((c) => (
          <ToggleRow key={c.id} label={c.name} value={c.enabled} onChange={(v) => toggleCategory(c.id, v)} />
        ))}
      </PanelCard>

      <PanelCard title="Platser">
        {locations.map((l) => (
          <ToggleRow key={l.id} label={`${l.name} (${l.type})`} value={l.enabled} onChange={(v) => toggleLocation(l.id, v)} />
        ))}
      </PanelCard>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.gold, false: colors.border }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2, marginBottom: spacing.md },
  serverUrl: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, marginBottom: spacing.sm },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, marginBottom: spacing.sm, lineHeight: 17 },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.inkSoft, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, fontFamily: fonts.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.cream },
  segment: { flexDirection: "row", gap: spacing.xs },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleLabel: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink, flex: 1, marginRight: spacing.sm },
});
