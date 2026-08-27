import React from "react";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/lib/constants/spacing";

export default function Terms() {
  return (
    <Screen scroll edges={["top"]}>
      <ScreenHeader title="Villkor" showBack />
      <Text variant="body" color="secondary" style={{ marginBottom: spacing.md }}>
        Platshållartext — ersätt med era faktiska användarvillkor innan lansering.
      </Text>
      <Text variant="body">
        Bilkoll tillhandahåller ett automatiserat beslutsunderlag baserat på den information du anger samt
        AI-driven analys. Bedömningarna är rekommendationer, inte garantier — du ansvarar själv för att
        verifiera uppgifter innan ett bilköp. Bilkoll är inte anslutet till eller officiellt samarbetar med
        Blocket, Wayke, Bytbil eller andra annonsplattformar.
      </Text>
    </Screen>
  );
}
