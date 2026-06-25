import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  serviceBaseUrl: required("SERVICE_BASE_URL"),
  webhookSecret: required("WEBHOOK_SECRET"),
  headless: optional("HEADLESS", "false") === "true",
  itrPortalUrl: optional(
    "ITR_PORTAL_URL",
    "https://www.incometax.gov.in/iec/foportal/"
  ),
} as const;