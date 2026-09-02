import { env } from "../config/env.js";
import { logger } from "../logging/logger.js";
import { recordNotification } from "../db/repositories/notificationsRepo.js";
import type { Lead } from "../core/types.js";

export function isTelegramConfigured(): boolean {
  return Boolean(env.telegramBotToken && env.telegramChatId);
}

/**
 * Sends a plain-text Telegram message via the Bot API. Section 26:
 * DRY_RUN=true (or missing credentials) skips the real HTTP call and only
 * logs — used for testing without spamming your own chat. Every attempt,
 * real or dry-run, is recorded in the `notifications` table so duplicates
 * are never re-sent by the digest/threshold logic.
 */
export async function sendTelegramMessage(
  text: string,
  opts: { leadId?: string | null; type: "HOT_LEAD" | "DIGEST" }
): Promise<boolean> {
  if (env.dryRun || !isTelegramConfigured()) {
    logger.info("NOTIFICATION_SKIPPED", env.dryRun ? "DRY_RUN active — not sending real Telegram message" : "Telegram not configured", {
      preview: text.slice(0, 80),
    });
    recordNotification({ leadId: opts.leadId ?? null, type: opts.type, success: true, error: null, message: text });
    return true;
  }

  try {
    const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.telegramChatId,
        text,
        disable_web_page_preview: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Telegram API ${res.status}: ${body.slice(0, 300)}`);
    }
    logger.info("NOTIFICATION_SENT", "Telegram message sent", { leadId: opts.leadId });
    recordNotification({ leadId: opts.leadId ?? null, type: opts.type, success: true, error: null, message: text });
    return true;
  } catch (err) {
    const error = String((err as Error)?.message || err);
    logger.error("ERROR", "Failed to send Telegram message", { error });
    recordNotification({ leadId: opts.leadId ?? null, type: opts.type, success: false, error, message: text });
    return false;
  }
}
