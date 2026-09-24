import type { ExternalSourceAdapter, ExternalSearchQuery, ExternalSourceAdapterResult } from "../types";

// Gemensam bas för källor som saknar ett officiellt, avtalat API att koppla mot.
// Rapporterar ärligt "unavailable" istället för att skrapa eller låtsas ha resultat.
// Den dag ett riktigt partner-/API-avtal finns: sätt motsvarande miljövariabel och
// byt ut `fetchReal` mot ett riktigt anrop mot källans officiella API.
export function createStubAdapter(source: string, requiredEnvVar: string): ExternalSourceAdapter {
  return {
    source,
    async search(_query: ExternalSearchQuery): Promise<ExternalSourceAdapterResult> {
      const apiKey = process.env[requiredEnvVar];
      if (!apiKey) {
        return {
          status: "unavailable",
          reason: `${source} har inget konfigurerat API-avtal (${requiredEnvVar} saknas). Ingen scraping utförs.`,
        };
      }
      // En riktig integration skulle anropa källans officiella API här.
      return { status: "unavailable", reason: `${source}-integrationen är inte implementerad ännu.` };
    },
  };
}
