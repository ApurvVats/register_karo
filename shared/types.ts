export type JobPhase =
  | "IDLE"
  | "NAVIGATING"
  | "CAPTCHA_SOLVING"
  | "CAPTCHA_FAILED"
  | "OTP_AWAITED"
  | "OTP_RECEIVED"
  | "SETTING_PASSWORD"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export type EventLevel = "info" | "warn" | "error" | "debug";

export interface JobEvent {
  jobId: string;
  seq: number;
  level: EventLevel;
  phase: JobPhase;
  step: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface Job {
  jobId: string;
  pan_masked: string;
  phase: JobPhase;
  startedAt: string;
  updatedAt: string;
  outcome: "SUCCESS" | "FAILED" | "CANCELLED" | null;
  durationMs: number | null;
  credentials?: {
    userId_enc: string;
    password_enc: string;
  };
  errorMessage?: string;
}

export interface WebhookEventPayload {
  jobId: string;
  level: EventLevel;
  phase: JobPhase;
  step: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface StartJobRequest {
  pan: string;
}

export interface StartJobResponse {
  jobId: string;
  message: string;
}

export interface SubmitOtpRequest {
  otp: string;
}

export interface JobListItem {
  jobId: string;
  pan_masked: string;
  phase: JobPhase;
  outcome: Job["outcome"];
  startedAt: string;
  updatedAt: string;
  durationMs: number | null;
}

export interface MetricsResponse {
  totalRuns: number;
  successCount: number;
  failedCount: number;
  runningCount: number;
  successRate: number;
  p50Ms: number | null;
  p99Ms: number | null;
}

export interface SseEnvelope {
  type: "event" | "phase_change" | "otp_request" | "complete" | "error";
  payload: JobEvent | JobPhaseChange | OtpRequest | JobComplete | JobError;
}

export interface JobPhaseChange {
  jobId: string;
  from: JobPhase;
  to: JobPhase;
  timestamp: string;
}

export interface OtpRequest {
  jobId: string;
  message: string;
  timestamp: string;
}

export interface JobComplete {
  jobId: string;
  outcome: "SUCCESS" | "FAILED" | "CANCELLED";
  durationMs: number;
  timestamp: string;
}

export interface JobError {
  jobId: string;
  step: string;
  message: string;
  timestamp: string;
}

export type MaskedPan = string;