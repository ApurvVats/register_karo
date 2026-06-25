import { z } from "zod";

export const panSchema = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must be in format ABCDE1234F");
export const startJobSchema = z.object({ pan: panSchema });
export const submitOtpSchema = z.object({ otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits") });

export const webhookEventSchema = z.object({
  jobId:   z.string().min(1),
  level:   z.enum(["info", "warn", "error", "debug"]),
  phase:   z.enum(["IDLE","NAVIGATING","CAPTCHA_SOLVING","CAPTCHA_FAILED","OTP_AWAITED","OTP_RECEIVED","SETTING_PASSWORD","SUCCESS","FAILED","CANCELLED"]),
  step:    z.string().min(1),
  message: z.string().min(1),
  meta:    z.record(z.unknown()).optional(),
});

export const listJobsQuerySchema = z.object({
  phase:   z.string().optional(),
  outcome: z.string().optional(),
  before:  z.string().optional(),
  limit:   z.coerce.number().int().min(1).max(100).optional(),
});