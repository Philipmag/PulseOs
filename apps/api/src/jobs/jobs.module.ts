import { Module, type Provider } from "@nestjs/common";
import { SystemJobsService } from "./system-jobs.service.js";
import { BrandBrainBuildProcessor } from "./brand-brain-build.processor.js";
import { BrandsModule } from "../brands/brands.module.js";
import { FilesModule } from "../files/files.module.js";

/**
 * Job orchestration. The queue *producer* is always available so the API can
 * enqueue. The *processor* is only registered in the worker role, so the API
 * process never consumes jobs (Phase 6 dual-role split). StorageModule,
 * ResearchModule and PrismaModule are global; BrandsModule/FilesModule supply
 * the processor's remaining dependencies.
 */
const isWorker = process.env.PROCESS_ROLE === "worker";
const workerProviders: Provider[] = isWorker
  ? [BrandBrainBuildProcessor]
  : [];

@Module({
  imports: [BrandsModule, FilesModule],
  providers: [SystemJobsService, ...workerProviders],
  exports: [SystemJobsService],
})
export class JobsModule {}
