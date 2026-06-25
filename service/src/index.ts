import { config } from "./config";
import { connectDb, closeDb } from "./repository/db";
import { sseManager } from "./sse/sseManager";
import { createApp } from "./app";
import { logger } from "./utils/logger";

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info("Service started", { port: config.port, env: config.nodeEnv });
  });

  async function shutdown(signal: string) {
    logger.info("Shutdown signal received", { signal });
    server.close(async () => {
      await sseManager.closeAll();
      await closeDb();
      logger.info("Graceful shutdown complete");
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { message: err.message });
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});