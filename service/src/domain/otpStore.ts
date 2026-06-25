const TTL_MS = 10 * 60 * 1000;

interface OtpEntry { otp: string; expiresAt: number; }
const store = new Map<string, OtpEntry>();

export const otpStore = {
  set(jobId: string, otp: string): void {
    store.set(jobId, { otp, expiresAt: Date.now() + TTL_MS });
  },
  consume(jobId: string): string | null {
    const entry = store.get(jobId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { store.delete(jobId); return null; }
    store.delete(jobId);
    return entry.otp;
  },
  has(jobId: string): boolean {
    const entry = store.get(jobId);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { store.delete(jobId); return false; }
    return true;
  },
};