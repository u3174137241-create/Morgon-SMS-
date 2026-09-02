import { getSettings } from "../db/repositories/settingsRepo.js";
import { getMeta, setMeta } from "../db/repositories/metaRepo.js";
import { runSearch } from "../core/pipeline.js";
import { logger } from "../logging/logger.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 min whether it's time to run
let running = false;
let timer: NodeJS.Timeout | null = null;

/**
 * Interval-based scheduler (section 15). Default: every 6 hours, configurable
 * live from settings without a restart. The last-run timestamp is persisted
 * so the interval survives process restarts (no immediate re-run just
 * because the app restarted).
 */
export function startScheduler(): void {
  if (timer) return;
  logger.info("SEARCH_STARTED", "Scheduler started", { checkIntervalMs: CHECK_INTERVAL_MS });
  timer = setInterval(() => {
    tick().catch((err) => logger.error("ERROR", "Scheduler tick failed", { error: String((err as Error)?.message || err) }));
  }, CHECK_INTERVAL_MS);
  // Also check once shortly after boot.
  tick().catch((err) => logger.error("ERROR", "Scheduler initial tick failed", { error: String((err as Error)?.message || err) }));
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

async function tick(): Promise<void> {
  if (running) return;
  const settings = getSettings();
  const lastRunAt = getMeta<string | null>("last_run_at", null);
  const intervalMs = settings.searchIntervalHours * 60 * 60 * 1000;

  if (lastRunAt && Date.now() - new Date(lastRunAt).getTime() < intervalMs) return;

  running = true;
  try {
    setMeta("last_run_at", new Date().toISOString());
    await runSearch();
  } finally {
    running = false;
  }
}

export async function triggerSearchNow(): Promise<ReturnType<typeof runSearch>> {
  if (running) throw new Error("A search run is already in progress");
  running = true;
  try {
    setMeta("last_run_at", new Date().toISOString());
    return await runSearch();
  } finally {
    running = false;
  }
}

export function isSearchRunning(): boolean {
  return running;
}
