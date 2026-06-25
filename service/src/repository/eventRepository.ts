import { EventModel } from "./eventModel";
import type { JobEvent } from "@itr/shared";

export const eventRepository = {
  async append(event: JobEvent): Promise<void> {
    await EventModel.create(event);
  },

  async replayFromCursor(jobId: string, afterSeq: number): Promise<JobEvent[]> {
    const docs = await EventModel.find({ jobId, seq: { $gt: afterSeq } }, { _id: 0, __v: 0 })
      .sort({ seq: 1 }).lean();
    return docs as JobEvent[];
  },

  async allForJob(jobId: string): Promise<JobEvent[]> {
    const docs = await EventModel.find({ jobId }, { _id: 0, __v: 0 })
      .sort({ seq: 1 }).lean();
    return docs as JobEvent[];
  },

  async latestSeq(jobId: string): Promise<number> {
    const doc = await EventModel.findOne({ jobId }, { seq: 1, _id: 0 }).sort({ seq: -1 }).lean();
    return doc ? (doc as JobEvent).seq : 0;
  },
};