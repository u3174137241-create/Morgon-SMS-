import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import type { Category, Lead, LeadStatus, LocationConfig } from "../types";
import { LEAD_STATUSES } from "../types";

export function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filter, setFilter] = useState<{ status?: string; category?: string; location?: string; minScore?: number }>({});

  const load = useCallback(async () => {
    try {
      const [l, c, loc] = await Promise.all([api.leads(filter), categories.length ? Promise.resolve(categories) : api.categories(), locations.length ? Promise.resolve(locations) : api.locations()]);
      setLeads(l);
      setCategories(c);
      setLocations(loc);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Kunde inte hämta leads");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onStatusChange = useCallback(
    async (id: string, status: LeadStatus) => {
      const updated = await api.updateLeadStatus(id, status);
      setSelected(updated);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    []
  );

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Leads</Text>
          <Text style={styles.subtitle}>Bläddra och hantera upptäckta leads.</Text>
        </View>
        <Button variant="outline" onPress={() => setFiltersOpen(true)}>
          Filter
        </Button>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={leads}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            0 leads matchar filtret. Systemet hittar aldrig på falska leads — "0 kvalificerade leads" är ett giltigt och ärligt resultat.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => setSelected(item)}>
            <Badge classification={item.classification} label={item.leadScore} />
            <View style={styles.rowBody}>
              <Text style={styles.rowService}>{item.service}</Text>
              <Text style={styles.rowMeta}>
                {item.category} · {item.location} · {item.ageDays ?? "?"} d{item.dateConfidence === "UNCERTAIN" ? " (osäkert)" : ""}
              </Text>
            </View>
            <Text style={styles.rowStatus}>{item.status}</Text>
          </Pressable>
        )}
      />

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        categories={categories}
        locations={locations}
        filter={filter}
        onApply={(f) => {
          setFilter(f);
          setFiltersOpen(false);
        }}
      />

      <LeadDetail lead={selected} onClose={() => setSelected(null)} onStatusChange={onStatusChange} />
    </View>
  );
}

function FilterSheet({
  visible,
  onClose,
  categories,
  locations,
  filter,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  locations: LocationConfig[];
  filter: { status?: string; category?: string; location?: string; minScore?: number };
  onApply: (f: { status?: string; category?: string; location?: string; minScore?: number }) => void;
}) {
  const [status, setStatus] = useState(filter.status);
  const [category, setCategory] = useState(filter.category);
  const [location, setLocation] = useState(filter.location);
  const [minScore, setMinScore] = useState(filter.minScore ? String(filter.minScore) : "");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Filtrera leads</Text>

          <Text style={styles.fieldLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Chip label="Alla" active={!status} onPress={() => setStatus(undefined)} />
            {LEAD_STATUSES.map((s) => (
              <Chip key={s} label={s} active={status === s} onPress={() => setStatus(s)} />
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Chip label="Alla" active={!category} onPress={() => setCategory(undefined)} />
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} active={category === c.id} onPress={() => setCategory(c.id)} />
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Plats</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Chip label="Alla" active={!location} onPress={() => setLocation(undefined)} />
            {locations.map((l) => (
              <Chip key={l.id} label={l.name} active={location === l.id} onPress={() => setLocation(l.id)} />
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Min score</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={minScore}
            onChangeText={setMinScore}
            placeholder="t.ex. 75"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.sheetActions}>
            <Button variant="plain" onPress={onClose}>
              Avbryt
            </Button>
            <Button
              variant="gold"
              onPress={() => onApply({ status, category, location, minScore: minScore ? Number(minScore) : undefined })}
            >
              Visa resultat
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function LeadDetail({ lead, onClose, onStatusChange }: { lead: Lead | null; onClose: () => void; onStatusChange: (id: string, s: LeadStatus) => void }) {
  return (
    <Modal visible={!!lead} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        {lead ? (
          <ScrollView style={styles.detailSheet} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{lead.service}</Text>
              <Badge classification={lead.classification} label={`${lead.leadScore}/100`} />
            </View>

            <DetailRow label="Kategori" value={lead.category} />
            <DetailRow label="Plats" value={lead.location} />
            <DetailRow label="Status" value={lead.status} />
            <DetailRow label="Ålder" value={`${lead.ageDays ?? "okänd"} dagar (${lead.dateConfidence})`} />
            <DetailRow label="Publicerad" value={lead.publishedAt ? new Date(lead.publishedAt).toLocaleString("sv-SE") : "okänt"} />
            <DetailRow label="Brådska" value={lead.urgency} />
            <DetailRow label="Värde" value={lead.estimatedValue} />
            <DetailRow label="Köpartyp" value={lead.buyerType} />
            <DetailRow label="Sammanfattning" value={lead.contentSummary} />
            <DetailRow label="Varför lead" value={lead.whyThisIsALead} />

            <View style={styles.actions}>
              <Button variant="gold" onPress={() => Linking.openURL(lead.sourceUrl)}>
                Öppna källa
              </Button>
              <Button variant="outline" onPress={() => onStatusChange(lead.id, "SOLD")}>
                Sold
              </Button>
              <Button variant="outline" onPress={() => onStatusChange(lead.id, "CONTACTED")}>
                Contacted
              </Button>
              <Button variant="outline" onPress={() => onStatusChange(lead.id, "REVIEWED")}>
                Reviewed
              </Button>
              <Button variant="outline" onPress={() => onStatusChange(lead.id, "DISCARDED")}>
                Discard
              </Button>
            </View>

            <View style={{ height: spacing.md }} />
            <Button variant="plain" onPress={onClose}>
              Stäng
            </Button>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingTop: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  error: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.fail, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { fontFamily: fonts.sans, fontStyle: "italic", fontSize: 12.5, color: colors.muted, padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  rowBody: { flex: 1 },
  rowService: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  rowMeta: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  rowStatus: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.muted },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(47,42,34,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "85%" },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink, marginBottom: spacing.md },
  fieldLabel: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.inkSoft, marginTop: spacing.sm, marginBottom: spacing.xs },
  chipRow: { flexDirection: "row" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, marginRight: 6, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.beige, borderColor: colors.gold },
  chipLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkSoft },
  chipLabelActive: { color: colors.goldDeep },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, fontFamily: fonts.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.cream },
  sheetActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.lg },
  detailSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, marginTop: 60 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  detailTitle: { fontFamily: fonts.serif, fontSize: 19, color: colors.ink, flex: 1 },
  detailRow: { marginBottom: spacing.sm },
  detailLabel: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink, marginTop: 2, lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
});
