import { config } from "../config";

type LogLevel = "debug" | "info" | "warn" | "error";
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const configured = LEVELS[config.log.level as LogLevel] ?? 1;

function log(level: LogLevel, message: string, meta?: object) {
  if (LEVELS[level] < configured) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...(meta ?? {}) });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, meta?: object) => log("debug", msg, meta),
  info:  (msg: string, meta?: object) => log("info",  msg, meta),
  warn:  (msg: string, meta?: object) => log("warn",  msg, meta),
  error: (msg: string, meta?: object) => log("error", msg, meta),
};