import axios, { AxiosError } from "axios";
import { config } from "../config";
import type { WebhookEventPayload } from "@itr/shared";

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 500;

const client = axios.create({
  baseURL: config.serviceBaseUrl,
  headers: {
    "Content-Type": "application/json",
    "x-webhook-secret": config.webhookSecret,
  },
  timeout: 8_000,
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function pushEvent(payload: WebhookEventPayload): Promise<void> {
  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    try {
      await client.post("/webhook/events", payload);
      return;
    } catch (err) {
      attempt++;
      const status = err instanceof AxiosError ? err.response?.status : null;
      if (status && status >= 400 && status < 500) throw err;
      if (attempt > MAX_RETRIES) throw err;
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.error(`[webhook] retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
      await sleep(delay);
    }
  }
}

export async function pollOtp(jobId: string): Promise<string | null> {
  try {
    const res = await client.get(`/jobs/${jobId}/otp`);
    return res.data?.otp ?? null;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return null;
    throw err;
  }
}