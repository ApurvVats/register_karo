import mongoose, { Schema, Document } from "mongoose";
import type { JobEvent } from "@itr/shared";

export type EventDocument = JobEvent & Document;

const EventSchema = new Schema<EventDocument>({
  jobId:     { type: String, required: true },
  seq:       { type: Number, required: true },
  level:     { type: String, required: true },
  phase:     { type: String, required: true },
  step:      { type: String, required: true },
  message:   { type: String, required: true },
  timestamp: { type: String, required: true },
  meta:      { type: Schema.Types.Mixed, default: {} },
}, { versionKey: false });

EventSchema.index({ jobId: 1, seq: 1 }, { unique: true });
EventSchema.index({ jobId: 1, timestamp: 1 });

export const EventModel = mongoose.model<EventDocument>("Event", EventSchema);