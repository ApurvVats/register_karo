import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function requireBearer(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== config.auth.bearerToken) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers["x-webhook-secret"] ?? "";
  if (!secret || secret !== config.auth.webhookSecret) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}