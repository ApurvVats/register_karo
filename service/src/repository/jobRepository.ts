import { v4 as uuidv4 } from "uuid";
import { JobModel } from "./jobModel";
import type { Job, JobPhase, JobListItem } from "@itr/shared";

export const jobRepository = {
  async create(pan_masked: string): Promise<Job> {
    const now = new Date().toISOString();
    const job = await JobModel.create({
      jobId: `job_${uuidv4()}`, pan_masked,
      phase: "IDLE", startedAt: now, updatedAt: now,
      outcome: null, durationMs: null,
    });
    return job.toObject() as Job;
  },

  async findById(jobId: string): Promise<Job | null> {
    const doc = await JobModel.findOne({ jobId }).lean();
    return doc as Job | null;
  },

  async updatePhase(jobId: string, phase: JobPhase): Promise<void> {
    await JobModel.updateOne({ jobId }, { $set: { phase, updatedAt: new Date().toISOString() } });
  },

  async complete(
    jobId: string,
    outcome: "SUCCESS" | "FAILED" | "CANCELLED",
    startedAt: string,
    extra?: { credentials?: Job["credentials"]; errorMessage?: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    const durationMs = Date.now() - new Date(startedAt).getTime();
    await JobModel.updateOne({ jobId }, {
      $set: {
        outcome,
        phase: outcome === "SUCCESS" ? "SUCCESS" : outcome === "CANCELLED" ? "CANCELLED" : "FAILED",
        updatedAt: now, durationMs,
        ...(extra?.credentials  && { credentials:  extra.credentials }),
        ...(extra?.errorMessage && { errorMessage: extra.errorMessage }),
      },
    });
  },

  async list(filters?: { phase?: JobPhase; outcome?: Job["outcome"]; limit?: number; before?: string }): Promise<JobListItem[]> {
    const query: Record<string, unknown> = {};
    if (filters?.phase)   query.phase   = filters.phase;
    if (filters?.outcome) query.outcome = filters.outcome;
    if (filters?.before)  query.updatedAt = { $lt: filters.before };
    const docs = await JobModel.find(query, {
      jobId: 1, pan_masked: 1, phase: 1, outcome: 1,
      startedAt: 1, updatedAt: 1, durationMs: 1, _id: 0,
    }).sort({ updatedAt: -1 }).limit(filters?.limit ?? 50).lean();
    return docs as JobListItem[];
  },

  async metrics() {
    const [counts, durations] = await Promise.all([
      JobModel.aggregate([{ $group: { _id: { outcome: "$outcome" }, count: { $sum: 1 } } }]),
      JobModel.find({ outcome: "SUCCESS", durationMs: { $ne: null } }, { durationMs: 1, _id: 0 }).lean(),
    ]);
    let total = 0, success = 0, failed = 0, running = 0;
    for (const c of counts) {
      total += c.count;
      if (c._id.outcome === "SUCCESS") success += c.count;
      else if (c._id.outcome === "FAILED" || c._id.outcome === "CANCELLED") failed += c.count;
      else running += c.count;
    }
    const dArr = durations.map((d) => d.durationMs as number).sort((a, b) => a - b);
    return {
      total, success, failed, running,
      p50: dArr.length ? dArr[Math.floor(dArr.length * 0.5)] : null,
      p99: dArr.length ? dArr[Math.floor(dArr.length * 0.99)] : null,
    };
  },
};