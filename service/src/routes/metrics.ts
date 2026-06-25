import { Router, Request, Response } from "express";
import { requireBearer } from "../middleware/auth";
import { jobService } from "../domain/jobService";

const router = Router();

router.get("/", requireBearer, async (_req: Request, res: Response) => {
  const metrics = await jobService.getMetrics();
  res.json(metrics);
});

export default router;