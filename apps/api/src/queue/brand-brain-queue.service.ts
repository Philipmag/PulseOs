import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { JOBS, QUEUES, type BrandBrainBuildPayload } from "./queue.constants.js";

/**
 * API-side producer. Controllers call this to enqueue Brand Brain builds; the
 * worker process consumes them. Keeps enqueue logic out of controllers.
 */
@Injectable()
export class BrandBrainQueueService {
  constructor(
    @InjectQueue(QUEUES.BRAND_BRAIN) private readonly queue: Queue,
  ) {}

  async enqueueBuild(brandId: string, initial: boolean): Promise<string> {
    const payload: BrandBrainBuildPayload = { brandId, initial };
    const job = await this.queue.add(
      initial ? JOBS.BRAND_BRAIN_INITIAL_BUILD : JOBS.BRAND_BRAIN_UPDATE,
      payload,
      { jobId: `brand-brain:${brandId}:${Date.now()}` },
    );
    return job.id ?? "";
  }
}
