import * as dotenv from "dotenv";
import * as path from "path";

// explicitly .env file ka path do
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "4000"), 10),
  nodeEnv: optional("NODE_ENV", "development"),
  mongo: { uri: required("MONGO_URI") },
  auth: {
    bearerToken: required("BEARER_TOKEN"),
    webhookSecret: required("WEBHOOK_SECRET"),
  },
  encryption: { key: required("ENCRYPTION_KEY") },
  sse: { ringBufferSize: parseInt(optional("SSE_RING_BUFFER_SIZE", "200"), 10) },
  log: { level: optional("LOG_LEVEL", "info") },
} as const;