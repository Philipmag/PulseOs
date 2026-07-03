import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { CryptoModule } from "./crypto/crypto.module.js";
import { AiModule } from "./ai/ai.module.js";
import { HealthModule } from "./health/health.module.js";
import { BrandsModule } from "./brands/brands.module.js";
import { QueueModule } from "./queue/queue.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { ResearchModule } from "./research/research.module.js";
import { FilesModule } from "./files/files.module.js";

/**
 * Root module. Global foundational modules (config, prisma, crypto, ai) are
 * wired here. Feature modules (Brand Brain, Audience Intelligence, ...) will be
 * added as each Phase 2 module is built.
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CryptoModule,
    AiModule,
    HealthModule,
    QueueModule,
    StorageModule,
    ResearchModule,
    FilesModule,
    BrandsModule,
    JobsModule,
  ],
})
export class AppModule {}
