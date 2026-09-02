import { env } from "../config/env.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

const currentLevel = LEVELS[env.logLevel] ?? LEVELS.info;

/**
 * Structured event tags used throughout the pipeline (section 24):
 * SEARCH_STARTED, SOURCE_STARTED, QUERY_EXECUTED, CANDIDATE_FOUND,
 * AI_ANALYSIS, LEAD_ACCEPTED, LEAD_REJECTED, DUPLICATE,
 * NOTIFICATION_SENT, ERROR.
 */
export type LogEvent =
  | "SEARCH_STARTED"
  | "SEARCH_FINISHED"
  | "SOURCE_STARTED"
  | "SOURCE_ERROR"
  | "QUERY_EXECUTED"
  | "CANDIDATE_FOUND"
  | "AI_ANALYSIS"
  | "LEAD_ACCEPTED"
  | "LEAD_REJECTED"
  | "DUPLICATE"
  | "STALE_SKIPPED"
  | "NOTIFICATION_SENT"
  | "NOTIFICATION_SKIPPED"
  | "ERROR";

function log(level: Level, event: LogEvent | string, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < currentLevel) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${event}: ${message}`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(line, meta ? JSON.stringify(meta) : "");
}

export const logger = {
  debug: (event: LogEvent | string, message: string, meta?: Record<string, unknown>) => log("debug", event, message, meta),
  info: (event: LogEvent | string, message: string, meta?: Record<string, unknown>) => log("info", event, message, meta),
  warn: (event: LogEvent | string, message: string, meta?: Record<string, unknown>) => log("warn", event, message, meta),
  error: (event: LogEvent | string, message: string, meta?: Record<string, unknown>) => log("error", event, message, meta),
};
