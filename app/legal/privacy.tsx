import React from "react";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/lib/constants/spacing";

export default function Privacy() {
  return (
    <Screen scroll edges={["top"]}>
      <ScreenHeader title="Integritetspolicy" showBack />
      <Text variant="body" color="secondary" style={{ marginBottom: spacing.md }}>
        Platshållartext — ersätt med er faktiska integritetspolicy innan lansering.
      </Text>
      <Text variant="body">
        Bilkoll samlar endast in den information som krävs för att analysera bilannonser och hantera ditt
        konto: annonsdata du själv anger eller laddar upp, resultat av dina analyser samt grundläggande
        kontouppgifter. Bilder du laddar upp behandlas säkert och delas aldrig med tredje part utan ditt
        samtycke. Du kan när som helst begära radering av dina data.
      </Text>
    </Screen>
  );
}
