import type { Job, JobEvent, JobListItem, MetricsResponse } from "../../shared/types";

const BASE  = process.env.NEXT_PUBLIC_SERVICE_URL  ?? "http://localhost:4000";
const TOKEN = process.env.NEXT_PUBLIC_BEARER_TOKEN ?? "dev_bearer_token_change_in_prod";
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` });

export async function startJob(pan: string): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE}/jobs`, { method: "POST", headers: headers(), body: JSON.stringify({ pan }) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error ?? `HTTP ${res.status}`); }
  return res.json();
}

export async function listJobs(params?: { phase?: string; outcome?: string; limit?: number }): Promise<{ jobs: JobListItem[] }> {
  const qs = new URLSearchParams();
  if (params?.phase)   qs.set("phase",   params.phase);
  if (params?.outcome) qs.set("outcome", params.outcome);
  if (params?.limit)   qs.set("limit",   String(params.limit));
  const res = await fetch(`${BASE}/jobs?${qs}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getJob(jobId: string): Promise<{ job: Job }> {
  const res = await fetch(`${BASE}/jobs/${jobId}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getEvents(jobId: string): Promise<{ events: JobEvent[] }> {
  const res = await fetch(`${BASE}/jobs/${jobId}/events`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function submitOtp(jobId: string, otp: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${jobId}/otp`, { method: "POST", headers: headers(), body: JSON.stringify({ otp }) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error ?? `HTTP ${res.status}`); }
}

export async function cancelJob(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${jobId}`, { method: "DELETE", headers: headers() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function getMetrics(): Promise<MetricsResponse> {
  const res = await fetch(`${BASE}/metrics`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}