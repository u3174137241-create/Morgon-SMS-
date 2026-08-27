import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { Button } from "@/components/ui/Button";
import { PremiumGate } from "@/components/ui/PremiumGate";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerdictBanner } from "@/components/analysis/VerdictBanner";
import { PriceRangeBar } from "@/components/analysis/PriceRangeBar";
import { RiskRow } from "@/components/analysis/RiskRow";
import { ChecklistItem } from "@/components/analysis/ChecklistItem";
import { NegotiationCard } from "@/components/analysis/NegotiationCard";
import { NegotiationMessageSheet } from "@/components/analysis/NegotiationMessageSheet";
import { DataQualitySection } from "@/components/analysis/DataQualitySection";
import { useTheme } from "@/hooks/useTheme";
import { usePremium } from "@/hooks/usePremium";
import { useChecklist } from "@/hooks/useChecklist";
import { spacing } from "@/lib/constants/spacing";
import { getAnalysis } from "@/services/analysisService";
import type { AnalysisResult } from "@/types/analysis";
import { formatSEK, formatMil } from "@/utils/currency";
import { carTitle } from "@/utils/format";
import { buildNegotiationMessage } from "@/features/analysis/negotiation";

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { isPremium } = usePremium();
  const [analysis, setAnalysis] = useState<AnalysisResult | null | undefined>(undefined);
  const [showMessage, setShowMessage] = useState(false);
  const checklist = useChecklist(id ?? "unknown");

  useEffect(() => {
    if (!id) return;
    getAnalysis(id).then((a) => setAnalysis(a ?? null));
  }, [id]);

  if (analysis === undefined) {
    return (
      <Screen scroll>
        <ScreenHeader title=" " showBack />
        <Skeleton height={120} style={{ marginBottom: spacing.md }} />
        <Skeleton height={200} style={{ marginBottom: spacing.md }} />
        <Skeleton height={140} />
      </Screen>
    );
  }

  if (analysis === null) {
    return (
      <Screen>
        <ScreenHeader title="Analys" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Analysen kunde inte hittas"
          message="Den här analysen finns inte längre, eller så gick något fel."
          ctaLabel="Till startsidan"
          onPressCta={() => router.replace("/(tabs)/home")}
        />
      </Screen>
    );
  }

  const { listing, priceAssessment, risks, negotiation, missingInformation } = analysis;
  const canShowPriceRange = priceAssessment.estimatedMarketMin != null && priceAssessment.estimatedMarketMax != null && priceAssessment.listedPrice != null;

  const verifiedFacts = [
    listing.modelYear ? `${listing.modelYear}` : null,
    listing.mileageKm ? formatMil(listing.mileageKm) : null,
    listing.price ? formatSEK(listing.price) : null,
    listing.fuelType && listing.fuelType !== "okänt" ? listing.fuelType[0].toUpperCase() + listing.fuelType.slice(1) : null,
    listing.gearbox && listing.gearbox !== "okänt" ? listing.gearbox[0].toUpperCase() + listing.gearbox.slice(1) : null,
  ].filter((v): v is string => v != null);

  const aiAssessmentFacts = [
    `Pris: ${
      priceAssessment.assessment === "fair"
        ? "rimligt"
        : priceAssessment.assessment === "cheap"
          ? "förmånligt"
          : priceAssessment.assessment === "expensive"
            ? "högt"
            : "osäkert"
    }`,
    `Risk: ${summarizeRiskLevels(risks)}`,
  ];

  return (
    <Screen scroll edges={["top"]}>
      <ScreenHeader title={carTitle(listing.make, listing.model)} showBack />

      {analysis.isDemo && (
        <View style={{ marginBottom: spacing.md, alignSelf: "flex-start" }}>
          <Badge label="Demo-analys" tone="neutral" />
        </View>
      )}

      <View style={styles.priceHeader}>
        <Text variant="callout" color="secondary">
          {[listing.modelYear, listing.mileageKm ? formatMil(listing.mileageKm) : null].filter(Boolean).join(" • ")}
        </Text>
        <Text variant="title1" style={{ marginTop: spacing.xxs }}>
          {listing.price != null ? formatSEK(listing.price) : "Pris saknas"}
        </Text>
      </View>

      <VerdictBanner verdict={analysis.verdict} confidence={analysis.confidence} />

      <SectionTitle>Vår bedömning</SectionTitle>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="body">{analysis.summary}</Text>
      </Card>

      <SectionTitle>Prisanalys</SectionTitle>
      <Card style={{ marginBottom: spacing.lg }}>
        {canShowPriceRange ? (
          <>
            <Text variant="subhead" color="secondary" style={{ marginBottom: spacing.sm }}>
              Marknadsvärde
            </Text>
            <PriceRangeBar
              min={priceAssessment.estimatedMarketMin!}
              max={priceAssessment.estimatedMarketMax!}
              listedPrice={priceAssessment.listedPrice!}
            />
          </>
        ) : (
          <Text variant="body" color="secondary">
            {priceAssessment.confidenceNote ?? "Prisbedömningen är osäker eftersom vi saknar tillräckligt med jämförelsedata."}
          </Text>
        )}
      </Card>

      <SectionTitle>Riskprofil</SectionTitle>
      <Card style={{ marginBottom: spacing.lg }}>
        {risks.map((risk, idx) => (
          <View key={risk.key}>
            <RiskRow risk={risk} />
            {idx < risks.length - 1 && <Divider />}
          </View>
        ))}
      </Card>

      <PremiumGate
        locked={!isPremium && !analysis.isDemo}
        title="Avancerad riskanalys"
        message="Lås upp konkreta kontrollpunkter baserat på just den här bilens riskprofil."
      >
        {analysis.recommendedChecks.length > 0 && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text variant="headline" style={{ marginBottom: spacing.sm }}>
              {analysis.recommendedChecks.length} saker att kontrollera
            </Text>
            <View style={{ gap: spacing.sm }}>
              {analysis.recommendedChecks.map((check, idx) => (
                <View key={idx} style={styles.checkRow}>
                  <Text variant="body" color="tertiary">
                    {idx + 1}.
                  </Text>
                  <Text variant="body" style={{ flex: 1 }}>
                    {check}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      </PremiumGate>

      <SectionTitle>Förhandlingsläge</SectionTitle>
      <PremiumGate
        locked={!isPremium && !analysis.isDemo}
        title="Förhandlingsanalys"
        message="Få ett rekommenderat bud, rimligt slutpris och färdiga argument att använda mot säljaren."
      >
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          <NegotiationCard negotiation={negotiation} listedPrice={listing.price} />
          {!showMessage ? (
            <Button label="Skapa meddelande till säljaren" variant="secondary" onPress={() => setShowMessage(true)} />
          ) : (
            <NegotiationMessageSheet message={buildNegotiationMessage(analysis)} />
          )}
        </View>
      </PremiumGate>

      <SectionTitle>Innan du köper</SectionTitle>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="footnote" color="secondary" style={{ marginBottom: spacing.sm }}>
          {checklist.completedCount} av {checklist.total} klara
        </Text>
        <View style={{ gap: spacing.xs }}>
          {checklist.items.map((item, idx) => (
            <ChecklistItem key={item} label={item} checked={!!checklist.checked[idx]} onToggle={() => checklist.toggle(idx)} />
          ))}
        </View>
      </Card>

      <SectionTitle>Datakvalitet</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        <DataQualitySection title="Från annonsen" tone="verified" items={verifiedFacts} />
        <DataQualitySection title="AI-bedömning" tone="estimate" items={aiAssessmentFacts} />
        <DataQualitySection title="Saknas" tone="missing" items={missingInformation} />
        {verifiedFacts.length === 0 && missingInformation.length === 0 && (
          <Text variant="footnote" color="tertiary">
            Ingen data att visa ännu.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="title3" style={{ marginBottom: spacing.sm, marginTop: spacing.xs }}>
      {children}
    </Text>
  );
}

function summarizeRiskLevels(risks: AnalysisResult["risks"]): string {
  const levels = risks.map((r) => r.level).filter((l) => l !== "unknown");
  if (levels.length === 0) return "okänd";
  if (levels.every((l) => l === "low")) return "låg";
  if (levels.some((l) => l === "high")) return "hög";
  return "låg–medel";
}

const styles = StyleSheet.create({
  priceHeader: { marginBottom: spacing.lg },
  checkRow: { flexDirection: "row", gap: spacing.xs },
});
