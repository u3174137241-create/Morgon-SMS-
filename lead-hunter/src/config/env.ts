import "dotenv/config";
import path from "node:path";

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === "") return fallback;
  return v.toLowerCase() === "true" || v === "1";
}

export const env = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",

  dryRun: bool(process.env.DRY_RUN, false),
  port: Number(process.env.PORT || 3100),
  appPassword: process.env.APP_PASSWORD || "",
  dbPath: process.env.DB_PATH || path.join(process.cwd(), "data", "leads.sqlite"),
  logLevel: (process.env.LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error",
};

export const DEFAULT_SETTINGS = {
  maxLeadAgeDays: 7,
  minScoreNotify: 75,
  searchIntervalHours: 6,
  searchIntensity: "MEDIUM" as const,
  telegramEnabled: true,
  dryRun: env.dryRun,
};
