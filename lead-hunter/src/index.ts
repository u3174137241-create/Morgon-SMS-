import { getDb } from "./db/db.js";
import { startHttpServer } from "./server/httpServer.js";
import { startScheduler } from "./scheduler/scheduler.js";
import { logger } from "./logging/logger.js";
import { activeAiClientName } from "./ai/index.js";
import { isTelegramConfigured } from "./notify/telegram.js";
import { env } from "./config/env.js";

getDb(); // opens the DB, runs migrations, seeds defaults

logger.info("SEARCH_STARTED", "AI Lead Hunter starting", {
  aiClient: activeAiClientName(),
  telegramConfigured: isTelegramConfigured(),
  dryRun: env.dryRun,
});

startHttpServer();
startScheduler();

process.on("SIGINT", () => {
  logger.info("SEARCH_FINISHED", "Shutting down");
  process.exit(0);
});
