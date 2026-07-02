import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { CryptoModule } from "./crypto/crypto.module.js";
import { AiModule } from "./ai/ai.module.js";
import { HealthModule } from "./health/health.module.js";
import { BrandsModule } from "./brands/brands.module.js";

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
    BrandsModule,
  ],
})
export class AppModule {}
