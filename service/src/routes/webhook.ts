import { Router, Request, Response } from "express";
import { requireWebhookSecret } from "../middleware/auth";
import { webhookEventSchema } from "../middleware/validate";
import { jobService } from "../domain/jobService";

const router = Router();

router.post("/events", requireWebhookSecret, async (req: Request, res: Response) => {
  const parsed = webhookEventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid event payload", details: parsed.error.flatten() }); return; }
  const event = await jobService.ingestEvent(parsed.data);
  res.status(201).json({ seq: event.seq });
});

export default router;