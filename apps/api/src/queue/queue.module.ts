import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { QUEUES } from "./queue.constants.js";
import { BrandBrainQueueService } from "./brand-brain-queue.service.js";

/**
 * Global BullMQ wiring. Connection comes from REDIS_URL. Both api and worker
 * roles import this so the api can enqueue and the worker can consume. Default
 * job options give every job bounded retries with exponential backoff
 * (Execution Rule #6).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>("REDIS_URL") },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
    ...Object.values(QUEUES).map((name) => BullModule.registerQueue({ name })),
  ],
  providers: [BrandBrainQueueService],
  exports: [BullModule, BrandBrainQueueService],
})
export class QueueModule {}
