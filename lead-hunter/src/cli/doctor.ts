import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

interface CheckResult {
  name: string;
  ok: boolean;
  level: "pass" | "warn" | "fail";
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => { ok: boolean; level?: "warn" | "fail"; detail: string }): void {
  try {
    const r = fn();
    const level = r.level ?? (r.ok ? "pass" : "fail");
    results.push({ name, ok: r.ok, level, detail: r.detail });
  } catch (err) {
    results.push({ name, ok: false, level: "fail", detail: String((err as Error)?.message || err) });
  }
}

check("Node.js-version", () => {
  const [major] = process.versions.node.split(".").map(Number);
  return major >= 22
    ? { ok: true, detail: `Node ${process.versions.node}` }
    : { ok: false, level: "fail", detail: `Node ${process.versions.node} — kräver >=22` };
});

check("Beroenden installerade", () => {
  const nodeModules = path.join(process.cwd(), "node_modules");
  const required = ["better-sqlite3", "cheerio", "dotenv"];
  const missing = required.filter((dep) => !fs.existsSync(path.join(nodeModules, dep)));
  return missing.length === 0
    ? { ok: true, detail: "Alla required-paket hittade i node_modules" }
    : { ok: false, level: "fail", detail: `Saknas: ${missing.join(", ")}. Kör "npm install".` };
});

check("Databas (SQLite)", () => {
  const dir = path.dirname(env.dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const testFile = path.join(dir, ".doctor-write-test");
  fs.writeFileSync(testFile, "ok");
  fs.unlinkSync(testFile);
  return { ok: true, detail: `Databaskatalog skrivbar: ${dir}` };
});

check("Miljövariabler — ANTHROPIC_API_KEY", () => {
  return env.anthropicApiKey
    ? { ok: true, detail: `Satt — AI-kvalificering via Anthropic (${env.anthropicModel})` }
    : { ok: true, level: "warn", detail: "Ej satt — använder gratis regelbaserad AI-fallback (fungerar, lägre precision)" };
});

check("Miljövariabler — Telegram", () => {
  if (env.telegramBotToken && env.telegramChatId) return { ok: true, detail: "Telegram konfigurerat" };
  return { ok: true, level: "warn", detail: "TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID ej satta — notiser loggas bara till konsolen" };
});

check("DRY_RUN-läge", () => {
  return { ok: true, detail: env.dryRun ? "Aktiverat — inga riktiga Telegram-meddelanden skickas" : "Avaktiverat — riktiga notiser skickas om Telegram är konfigurerat" };
});

check("Filsystemsbehörigheter (data/)", () => {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.accessSync(dataDir, fs.constants.W_OK);
  return { ok: true, detail: `Skrivbar: ${dataDir}` };
});

async function checkSourceAdapters() {
  const { SOURCE_ADAPTERS } = await import("../sources/registry.js");
  results.push({
    name: "Källadaptrar registrerade",
    ok: SOURCE_ADAPTERS.length > 0,
    level: SOURCE_ADAPTERS.length > 0 ? "pass" : "fail",
    detail: SOURCE_ADAPTERS.map((a) => `${a.name} (${a.type})`).join(", "),
  });
}

async function main() {
  await checkSourceAdapters();

  console.log("\n🩺 AI Lead Hunter — Doctor\n");
  let hasFail = false;
  for (const r of results) {
    const icon = r.level === "pass" ? "✅" : r.level === "warn" ? "⚠️ " : "❌";
    if (r.level === "fail") hasFail = true;
    console.log(`${icon} ${r.name}: ${r.detail}`);
  }
  console.log("");
  if (hasFail) {
    console.log("Ett eller flera kritiska fel hittades. Åtgärda ovan innan du kör systemet.");
    process.exit(1);
  } else {
    console.log("Allt ser bra ut. Kör `npm run dev` för att starta systemet.");
    process.exit(0);
  }
}

main();
