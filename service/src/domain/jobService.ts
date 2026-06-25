const path = require("path");
const { spawn } = require("child_process");
const { jobRepository } = require("../repository/jobRepository");
const { eventRepository } = require("../repository/eventRepository");
const { sseManager } = require("../sse/sseManager");
const { otpStore } = require("./otpStore");
const { maskPan } = require("../utils/crypto");
const { logger } = require("../utils/logger");

function spawnBot(jobId: string, pan: string): void {
  const botEntry = path.resolve(__dirname, "../../../automation/dist/index.js");
  const botEnvPath = path.resolve(__dirname, "../../../automation/.env");
  
  // dotenv load karo automation ka
  const dotenv = require("dotenv");
  const botEnv = dotenv.config({ path: botEnvPath }).parsed ?? {};

  logger.info("Spawning bot", { jobId, botEntry });
  
  const child = spawn("node", [botEntry, jobId, pan], {
    env: { 
      ...process.env,
      ...botEnv,
      // explicitly set karo
      SERVICE_BASE_URL: botEnv.SERVICE_BASE_URL ?? "http://localhost:4000",
      WEBHOOK_SECRET: botEnv.WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET ?? "",
      HEADLESS: botEnv.HEADLESS ?? "false",
      ITR_PORTAL_URL: botEnv.ITR_PORTAL_URL ?? "https://www.incometax.gov.in/iec/foportal/",
    },
    stdio: "inherit",
    detached: false,
  });

  child.on("error", (err: Error) => {
    logger.error("Bot process error", { jobId, message: err.message });
  });

  child.on("exit", (code: number) => {
    if (code !== 0) logger.warn("Bot exited non-zero", { jobId, code });
  });
}

const jobService = {
  async startJob(pan: string): Promise<{ jobId: string }> {
    const pan_masked = maskPan(pan);
    const job = await jobRepository.create(pan_masked);
    logger.info("Job created", { jobId: job.jobId, pan_masked });
    spawnBot(job.jobId, pan);
    return { jobId: job.jobId };
  },

  async getJob(jobId: string): Promise<any> {
    return jobRepository.findById(jobId);
  },

  async listJobs(filters?: any): Promise<any[]> {
    return jobRepository.list(filters);
  },

  async ingestEvent(payload: any): Promise<any> {
    const seq = (await eventRepository.latestSeq(payload.jobId)) + 1;
    const event = { ...payload, seq, timestamp: new Date().toISOString() };
    await eventRepository.append(event);
    await jobRepository.updatePhase(payload.jobId, payload.phase);
    if (["SUCCESS","FAILED","CANCELLED"].includes(payload.phase)) {
      const job = await jobRepository.findById(payload.jobId);
      if (job) {
        await jobRepository.complete(
          payload.jobId, payload.phase, job.startedAt,
          payload.phase === "FAILED" ? { errorMessage: payload.message } : undefined
        );
      }
    }
    sseManager.broadcast(event);
    logger.debug("Event ingested", { jobId: payload.jobId, seq, step: payload.step });
    return event;
  },

  submitOtp(jobId: string, otp: string): void {
    otpStore.set(jobId, otp);
    logger.info("OTP stored for job", { jobId });
  },

  consumeOtp(jobId: string): string | null {
    return otpStore.consume(jobId);
  },

  async getEvents(jobId: string): Promise<any[]> {
    return eventRepository.allForJob(jobId);
  },

  async getMetrics(): Promise<any> {
    const m = await jobRepository.metrics();
    return {
      totalRuns: m.total,
      successCount: m.success,
      failedCount: m.failed,
      runningCount: m.running,
      successRate: m.total > 0 ? Math.round((m.success / m.total) * 100) : 0,
      p50Ms: m.p50 ?? null,
      p99Ms: m.p99 ?? null,
    };
  },

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await jobRepository.findById(jobId);
    if (!job || job.outcome !== null) return false;
    await jobRepository.complete(jobId, "CANCELLED", job.startedAt);
    logger.info("Job cancelled", { jobId });
    return true;
  },
};

module.exports = { jobService };