import mongoose, { Schema, Document } from "mongoose";
import type { Job } from "@itr/shared";

export type JobDocument = Job & Document;

const JobSchema = new Schema<JobDocument>({
  jobId:       { type: String, required: true, unique: true },
  pan_masked:  { type: String, required: true },
  phase:       { type: String, required: true, default: "IDLE" },
  startedAt:   { type: String, required: true },
  updatedAt:   { type: String, required: true },
  outcome:     { type: String, default: null },
  durationMs:  { type: Number, default: null },
  credentials: {
    userId_enc:   { type: String },
    password_enc: { type: String },
  },
  errorMessage: { type: String, default: null },
}, { versionKey: false });

JobSchema.index({ updatedAt: -1 });
JobSchema.index({ phase: 1, updatedAt: -1 });
JobSchema.index({ outcome: 1, updatedAt: -1 });

export const JobModel = mongoose.model<JobDocument>("Job", JobSchema);