import { Module } from "@nestjs/common";
import { BrandsController } from "./brands.controller.js";
import { BrandsService } from "./brands.service.js";
import { BrandBrainService } from "./brand-brain.service.js";
import { BrandSummaryService } from "./brand-summary.service.js";

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, BrandBrainService, BrandSummaryService],
  exports: [BrandBrainService, BrandSummaryService], // retrieved by other modules
})
export class BrandsModule {}
