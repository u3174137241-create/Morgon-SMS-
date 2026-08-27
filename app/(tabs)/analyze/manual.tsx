import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/forms/FormField";
import { ChipSelect } from "@/components/forms/ChipSelect";
import { spacing } from "@/lib/constants/spacing";
import { draftListingStore, useDraftListing } from "@/lib/draftListingStore";
import { usageService } from "@/services/usageService";
import type { FuelType, Gearbox } from "@/types/car";

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: "bensin", label: "Bensin" },
  { value: "diesel", label: "Diesel" },
  { value: "el", label: "El" },
  { value: "laddhybrid", label: "Laddhybrid" },
  { value: "hybrid", label: "Hybrid" },
  { value: "gas", label: "Gas" },
];

const GEARBOX_OPTIONS: { value: Gearbox; label: string }[] = [
  { value: "manuell", label: "Manuell" },
  { value: "automat", label: "Automat" },
];

function toNumberOrNull(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  return digits.length ? Number(digits) : null;
}

export default function ManualEntry() {
  const initial = useDraftListing();
  const [make, setMake] = useState(initial.make ?? "");
  const [model, setModel] = useState(initial.model ?? "");
  const [modelYear, setModelYear] = useState(initial.modelYear ? String(initial.modelYear) : "");
  const [mileageKm, setMileageKm] = useState(initial.mileageKm ? String(initial.mileageKm) : "");
  const [fuelType, setFuelType] = useState<FuelType | null>(initial.fuelType);
  const [gearbox, setGearbox] = useState<Gearbox | null>(initial.gearbox);
  const [engine, setEngine] = useState(initial.engine ?? "");
  const [powerHp, setPowerHp] = useState(initial.powerHp ? String(initial.powerHp) : "");
  const [price, setPrice] = useState(initial.price ? String(initial.price) : "");
  const [ownerCount, setOwnerCount] = useState(initial.ownerCount ? String(initial.ownerCount) : "");
  const [serviceHistoryNotes, setServiceHistoryNotes] = useState(initial.serviceHistoryNotes ?? "");
  const [equipment, setEquipment] = useState(initial.equipment.join(", "));
  const [description, setDescription] = useState(initial.description ?? "");
  const [region, setRegion] = useState(initial.region ?? "");

  const missingCount = useMemo(() => {
    let count = 0;
    if (!make.trim()) count++;
    if (!model.trim()) count++;
    if (!modelYear.trim()) count++;
    if (!mileageKm.trim()) count++;
    if (!price.trim()) count++;
    return count;
  }, [make, model, modelYear, mileageKm, price]);

  const canSubmit = make.trim().length > 0 || model.trim().length > 0 || price.trim().length > 0;

  const handleSubmit = async () => {
    const canAnalyze = await usageService.canAnalyze();
    if (!canAnalyze) {
      router.push("/paywall");
      return;
    }
    draftListingStore.update({
      make: make.trim() || null,
      model: model.trim() || null,
      modelYear: toNumberOrNull(modelYear),
      mileageKm: toNumberOrNull(mileageKm),
      fuelType,
      gearbox,
      engine: engine.trim() || null,
      powerHp: toNumberOrNull(powerHp),
      price: toNumberOrNull(price),
      ownerCount: toNumberOrNull(ownerCount),
      serviceHistoryNotes: serviceHistoryNotes.trim() || null,
      equipment: equipment
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      description: description.trim() || null,
      region: region.trim() || null,
    });
    router.push("/(tabs)/analyze/progress");
  };

  return (
    <Screen scroll edges={["top"]}>
      <ScreenHeader title="Bilens uppgifter" subtitle="Fyll i det du vet — resten markerar vi som saknat." showBack />

      {initial.imageUris.length > 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text variant="footnote" color="secondary">
            {initial.imageUris.length} bild(er) bifogade och skickas med i analysen.
          </Text>
        </Card>
      )}

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="headline" style={{ marginBottom: spacing.sm }}>
          Grundinformation
        </Text>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <FormField label="Märke" placeholder="t.ex. Volvo" value={make} onChangeText={setMake} />
          </View>
          <View style={styles.col}>
            <FormField label="Modell" placeholder="t.ex. V60" value={model} onChangeText={setModel} />
          </View>
        </View>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <FormField label="Årsmodell" placeholder="2019" keyboardType="number-pad" value={modelYear} onChangeText={setModelYear} />
          </View>
          <View style={styles.col}>
            <FormField label="Miltal (km)" placeholder="12000" keyboardType="number-pad" value={mileageKm} onChangeText={setMileageKm} />
          </View>
        </View>
        <FormField label="Pris (kr)" placeholder="149000" keyboardType="number-pad" value={price} onChangeText={setPrice} />
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="headline" style={{ marginBottom: spacing.sm }}>
          Teknik
        </Text>
        <ChipSelect label="Drivmedel" options={FUEL_OPTIONS} value={fuelType} onChange={setFuelType} />
        <ChipSelect label="Växellåda" options={GEARBOX_OPTIONS} value={gearbox} onChange={setGearbox} />
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <FormField label="Motor" placeholder="2.0 D4" optional value={engine} onChangeText={setEngine} />
          </View>
          <View style={styles.col}>
            <FormField label="Effekt (hk)" placeholder="190" optional keyboardType="number-pad" value={powerHp} onChangeText={setPowerHp} />
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="headline" style={{ marginBottom: spacing.sm }}>
          Historik
        </Text>
        <FormField label="Antal tidigare ägare" optional keyboardType="number-pad" value={ownerCount} onChangeText={setOwnerCount} />
        <FormField
          label="Servicehistorik"
          optional
          placeholder="t.ex. Fullservad hos märkesverkstad"
          value={serviceHistoryNotes}
          onChangeText={setServiceHistoryNotes}
          multiline
        />
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="headline" style={{ marginBottom: spacing.sm }}>
          Annons
        </Text>
        <FormField label="Utrustning" optional placeholder="Skinn, Navigation, Dragkrok" value={equipment} onChangeText={setEquipment} />
        <FormField label="Beskrivning" optional placeholder="Klistra in annonstexten" value={description} onChangeText={setDescription} multiline style={{ minHeight: 90, paddingTop: spacing.xs }} />
        <FormField label="Ort" optional placeholder="t.ex. Stockholm" value={region} onChangeText={setRegion} />
      </Card>

      {missingCount > 0 && (
        <Text variant="footnote" color="secondary" style={{ marginBottom: spacing.md }}>
          {missingCount} fält saknas fortfarande — det är okej, vi visar det tydligt i resultatet istället för att gissa.
        </Text>
      )}

      <Button label="Starta analys" onPress={handleSubmit} disabled={!canSubmit} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  twoCol: { flexDirection: "row", gap: spacing.sm },
  col: { flex: 1 },
});
