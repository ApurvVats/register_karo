const express = require("express");
const cors = require("cors");
import type { Request, Response, NextFunction } from "express";
import { requestId } from "./middleware/requestId";
import { logger } from "./utils/logger";
import jobsRouter from "./routes/jobs";
import webhookRouter from "./routes/webhook";
import metricsRouter from "./routes/metrics";

export function createApp() {
  const app = express();

  // CORS — UI ko service se baat karne do
  app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-webhook-secret", "x-request-id", "Last-Event-ID"],
  }));

  app.use(express.json());
  app.use(requestId);

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug("Incoming request", { method: req.method, path: req.path });
    next();
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  app.use("/jobs",    jobsRouter);
  app.use("/webhook", webhookRouter);
  app.use("/metrics", metricsRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled error", { message: err.message });
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}