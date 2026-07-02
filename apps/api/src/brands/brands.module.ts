import { Module } from "@nestjs/common";
import { BrandsController } from "./brands.controller.js";
import { BrandsService } from "./brands.service.js";
import { BrandBrainService } from "./brand-brain.service.js";

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, BrandBrainService],
  exports: [BrandBrainService], // every other module retrieves context from here
})
export class BrandsModule {}
