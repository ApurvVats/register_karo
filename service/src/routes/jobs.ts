import { Router, Request, Response } from "express";
import { requireBearer } from "../middleware/auth";
import { startJobSchema, submitOtpSchema, listJobsQuerySchema } from "../middleware/validate";
const { jobService } = require("../domain/jobService");
import { eventRepository } from "../repository/eventRepository";
import { sseManager, formatSseEvent } from "../sse/sseManager";
import { logger } from "../utils/logger";

const router = Router();

router.post("/", requireBearer, async (req: Request, res: Response) => {
  const parsed = startJobSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() }); return; }
  const { jobId } = await jobService.startJob(parsed.data.pan);
  res.status(201).json({ jobId, message: "Job started" });
});

router.get("/", requireBearer, async (req: Request, res: Response) => {
  const parsed = listJobsQuerySchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const jobs = await jobService.listJobs(parsed.data as Parameters<typeof jobService.listJobs>[0]);
  res.json({ jobs });
});

router.get("/:id", requireBearer, async (req: Request, res: Response) => {
  const job = await jobService.getJob(req.params.id);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({ job });
});

router.delete("/:id", requireBearer, async (req: Request, res: Response) => {
  const cancelled = await jobService.cancelJob(req.params.id);
  if (!cancelled) { res.status(400).json({ error: "Job not found or already complete" }); return; }
  res.json({ message: "Job cancelled" });
});

router.post("/:id/otp", requireBearer, async (req: Request, res: Response) => {
  const parsed = submitOtpSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() }); return; }
  const job = await jobService.getJob(req.params.id);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  jobService.submitOtp(req.params.id, parsed.data.otp);
  res.json({ message: "OTP received" });
});

router.get("/:id/otp", async (req: Request, res: Response) => {
  const webhookSecret = req.headers["x-webhook-secret"];
  if (webhookSecret !== process.env.WEBHOOK_SECRET) { res.status(401).json({ error: "Unauthorized" }); return; }
  const otp = jobService.consumeOtp(req.params.id);
  if (!otp) { res.status(204).end(); return; }
  res.json({ otp });
});

router.get("/:id/events", requireBearer, async (req: Request, res: Response) => {
  const events = await jobService.getEvents(req.params.id);
  res.json({ events });
});

router.get("/:id/stream", async (req: Request, res: Response) => {
  const jobId = req.params.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const lastId = parseInt(req.headers["last-event-id"] as string ?? "0", 10);

  if (lastId > 0) {
    const missed = await eventRepository.replayFromCursor(jobId, lastId);
    for (const ev of missed) res.write(formatSseEvent(ev));
    logger.debug("SSE replay sent", { jobId, lastId, count: missed.length });
  } else {
    const history = await eventRepository.allForJob(jobId);
    for (const ev of history) res.write(formatSseEvent(ev));
  }

  const client = sseManager.addClient(jobId, res);
  const heartbeat = setInterval(() => { try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); } }, 20_000);
  req.on("close", () => { clearInterval(heartbeat); sseManager.removeClient(client); });
});

export default router;