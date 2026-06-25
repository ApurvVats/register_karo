import type { Response } from "express";
import type { JobEvent } from "@itr/shared";
import { config } from "../config";
import { logger } from "../utils/logger";

interface SseClient { jobId: string; res: Response; }

class RingBuffer<T> {
  private buf: T[];
  private head = 0;
  private count = 0;
  private readonly size: number;

  constructor(size: number) { this.size = size; this.buf = new Array(size); }

  push(item: T): void {
    this.buf[this.head % this.size] = item;
    this.head++;
    this.count = Math.min(this.count + 1, this.size);
  }

  toArray(): T[] {
    if (this.count < this.size) return this.buf.slice(0, this.count);
    const start = this.head % this.size;
    return [...this.buf.slice(start), ...this.buf.slice(0, start)];
  }
}

class SseManager {
  private clients = new Map<string, Set<SseClient>>();
  private buffers = new Map<string, RingBuffer<JobEvent>>();
  private bufSize = config.sse.ringBufferSize;

  addClient(jobId: string, res: Response): SseClient {
    const client: SseClient = { jobId, res };
    if (!this.clients.has(jobId)) this.clients.set(jobId, new Set());
    this.clients.get(jobId)!.add(client);
    logger.debug("SSE client connected", { jobId });
    return client;
  }

  removeClient(client: SseClient): void {
    this.clients.get(client.jobId)?.delete(client);
  }

  broadcast(event: JobEvent): void {
    if (!this.buffers.has(event.jobId)) this.buffers.set(event.jobId, new RingBuffer(this.bufSize));
    this.buffers.get(event.jobId)!.push(event);

    const clients = this.clients.get(event.jobId);
    if (!clients || clients.size === 0) return;

    const sseData = formatSseEvent(event);
    for (const client of clients) {
      try { client.res.write(sseData); }
      catch { logger.warn("SSE write failed", { jobId: event.jobId }); this.removeClient(client); }
    }
  }

  getBuffer(jobId: string): JobEvent[] {
    return this.buffers.get(jobId)?.toArray() ?? [];
  }

  async closeAll(): Promise<void> {
    for (const [, clients] of this.clients)
      for (const client of clients)
        try { client.res.end(); } catch { /* ignore */ }
    this.clients.clear();
    logger.info("All SSE connections closed");
  }
}

export function formatSseEvent(event: JobEvent): string {
  return `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`;
}

export const sseManager = new SseManager();