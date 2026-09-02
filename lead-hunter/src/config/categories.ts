import type { Category } from "../core/types.js";

/**
 * Default category catalogue (section 6 of the spec). Each category carries
 * the service keywords used by the SearchStrategyEngine to build queries,
 * and the buyer types used for BUYER MATCHING (section 18).
 *
 * This is only the seed data used to populate the `categories` table on
 * first run — after that, the database is the source of truth and this
 * file is not read again. Users can add/edit/disable categories entirely
 * from the dashboard/DB without touching code.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  // ── Hem / Renovering ────────────────────────────────────────────────────
  cat("badrumsrenovering", "Badrumsrenovering", ["badrum", "badrumsrenovering"], ["Badrumsfirma", "Byggfirma", "Totalentreprenör"]),
  cat("koksrenovering", "Köksrenovering", ["kök", "köksrenovering"], ["Kökssnickare", "Byggfirma", "Totalentreprenör"]),
  cat("renovering", "Renovering (allmän)", ["renovering", "husrenovering", "lägenhetsrenovering"], ["Byggfirma", "Totalentreprenör", "Hantverkare"]),
  cat("malning", "Målning", ["målare", "målning", "målningsjobb"], ["Målarfirma", "Hantverkare"]),
  cat("tapetsering", "Tapetsering", ["tapetsering", "tapetsera"], ["Målarfirma", "Inredningshantverkare"]),
  cat("golvlaggning", "Golvläggning", ["golvläggning", "golvläggare", "parkettläggning"], ["Golvfirma", "Byggfirma"]),
  cat("taklaggning", "Takläggning", ["takläggning", "takläggare", "takrenovering", "byta tak"], ["Takfirma", "Byggfirma"]),
  cat("fasad", "Fasad", ["fasadrenovering", "fasadmålning", "fasadarbete"], ["Fasadfirma", "Byggfirma"]),
  cat("fonster", "Fönster", ["fönsterbyte", "byta fönster", "fönsterrenovering"], ["Fönsterfirma", "Snickeri"]),
  cat("dorrar", "Dörrar", ["dörrbyte", "byta dörr", "dörrmontering"], ["Snickeri", "Byggfirma"]),
  cat("snickeri", "Snickeri", ["snickare", "snickeri", "specialsnickeri"], ["Snickeri", "Hantverkare"]),
  cat("bygg", "Bygg (allmän)", ["byggfirma", "byggarbete", "tillbyggnad", "attefallshus"], ["Byggfirma", "Totalentreprenör"]),
  cat("rivning", "Rivning", ["rivning", "rivningsarbete"], ["Rivningsfirma", "Byggfirma"]),
  cat("markarbete", "Markarbete", ["markarbete", "grävarbete", "dränering", "asfaltering"], ["Markentreprenör", "Grävfirma"]),
  cat("tradgard", "Trädgård", ["trädgårdsarbete", "trädgårdsdesign", "trädfällning", "häckklippning", "anläggning trädgård"], ["Trädgårdsfirma", "Anläggningsfirma"]),

  // ── Installation ────────────────────────────────────────────────────────
  cat("elektriker", "Elektriker", ["elektriker", "elinstallation", "elarbete"], ["Elfirma"]),
  cat("vvs", "VVS", ["vvs", "vvs-firma", "vvs-installation"], ["VVS-firma"]),
  cat("rormokare", "Rörmokare", ["rörmokare", "rörläggning", "läckande rör"], ["VVS-firma", "Rörfirma"]),
  cat("ventilation", "Ventilation", ["ventilation", "ventilationsservice", "ova"], ["Ventilationsfirma"]),
  cat("varmepump", "Värmepump", ["värmepump", "installera värmepump", "bergvärme", "luftvärmepump"], ["Värmepumpsfirma", "VVS-firma"]),
  cat("luftkonditionering", "Luftkonditionering", ["luftkonditionering", "ac-installation", "kyla"], ["Kylfirma", "VVS-firma"]),
  cat("lassmed", "Låssmed", ["låssmed", "byta lås", "låsservice"], ["Låssmedsfirma"]),

  // ── Städ / Flytt ────────────────────────────────────────────────────────
  cat("hemstadning", "Hemstädning", ["hemstädning", "städhjälp", "städning hemma"], ["Städfirma"]),
  cat("flyttstadning", "Flyttstädning", ["flyttstäd", "flyttstädning"], ["Städfirma"]),
  cat("kontorsstadning", "Kontorsstädning", ["kontorsstädning", "städning kontor"], ["Städfirma"]),
  cat("fonsterputs", "Fönsterputs", ["fönsterputs", "fönsterputsning"], ["Städfirma", "Fönsterputsfirma"]),
  cat("flyttfirma", "Flyttfirma", ["flyttfirma", "flytthjälp", "flytt hjälp"], ["Flyttfirma"]),
  cat("magasinering", "Magasinering", ["magasinering", "förvaring", "self storage"], ["Magasineringsfirma"]),

  // ── Fordon ──────────────────────────────────────────────────────────────
  cat("bilreparation", "Bilreparation", ["bilverkstad", "bilreparation", "bilservice"], ["Bilverkstad"]),
  cat("bilverkstad", "Bilverkstad", ["bilverkstad", "verkstad bil"], ["Bilverkstad"]),
  cat("dack", "Däck", ["däckbyte", "däckhotell", "nya däck"], ["Däckfirma", "Bilverkstad"]),
  cat("bilrekond", "Bilrekond", ["bilrekond", "rekonditionering bil"], ["Rekondfirma"]),
  cat("bilvard", "Bilvård", ["bilvård", "biltvätt", "polering bil"], ["Bilvårdsfirma"]),
  cat("lackering", "Lackering", ["billackering", "lackskada", "lackering bil"], ["Lackeringsfirma", "Bilverkstad"]),
  cat("bargning", "Bärgning", ["bärgning", "bärgningshjälp"], ["Bärgningsfirma"]),

  // ── Företagstjänster ────────────────────────────────────────────────────
  cat("redovisning", "Redovisning", ["redovisningsbyrå", "redovisningskonsult"], ["Redovisningsbyrå"]),
  cat("bokforing", "Bokföring", ["bokföringshjälp", "bokförare"], ["Redovisningsbyrå", "Bokföringsbyrå"]),
  cat("webbyra", "Webbyrå", ["webbyrå", "hemsida företag", "webbutveckling"], ["Webbyrå"]),
  cat("hemsida", "Hemsida", ["bygga hemsida", "ny hemsida", "webbdesign"], ["Webbyrå", "Frilansande webbutvecklare"]),
  cat("fotograf", "Fotograf", ["fotograf", "företagsfotografering", "produktfoto"], ["Fotograf"]),
  cat("videoproduktion", "Videoproduktion", ["videoproduktion", "reklamfilm", "företagsvideo"], ["Videoproduktionsbolag"]),
  cat("marknadsforing", "Marknadsföring", ["marknadsföringshjälp", "marknadsföringsbyrå"], ["Marknadsföringsbyrå"]),
  cat("seo", "SEO", ["seo-hjälp", "sökmotoroptimering"], ["SEO-byrå", "Digitalbyrå"]),
  cat("it-support", "IT-support", ["it-support", "it-konsult", "it-drift"], ["IT-konsultbolag"]),
];

function cat(id: string, name: string, keywords: string[], buyerTypes: string[]): Category {
  return { id, name, enabled: true, keywords, buyerTypes };
}
