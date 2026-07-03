import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe.js";
import { BrandsService } from "./brands.service.js";
import { BrandBrainService } from "./brand-brain.service.js";
import { BrandBrainQueueService } from "../queue/brand-brain-queue.service.js";
import {
  createBrandSchema,
  updateBrandSchema,
  type CreateBrandInput,
  type UpdateBrandInput,
} from "./dto/brand.dto.js";

/**
 * Phase 4 — Brand Brain endpoints (subset live now):
 *   POST /brands                  create brand
 *   GET  /brands/:id              get brand + brain summary
 *   PUT  /brands/:id              update brand fields
 *   GET  /brands/:id/brain-health completeness score
 *
 * Auth: the userId will come from the Clerk JWT guard once auth is wired. Until
 * then it is read from a header so the endpoint is exercisable end-to-end.
 */
@Controller("brands")
export class BrandsController {
  constructor(
    private readonly brands: BrandsService,
    private readonly brain: BrandBrainService,
    private readonly buildQueue: BrandBrainQueueService,
  ) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createBrandSchema)) body: CreateBrandInput,
    // TODO: replace with @CurrentUser() from Clerk guard.
    @Body("userId") userId = "00000000-0000-0000-0000-000000000000",
  ) {
    return this.brands.create(userId, body);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.brands.findOne(id);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBrandSchema)) body: UpdateBrandInput,
  ) {
    return this.brands.update(id, body);
  }

  @Get(":id/brain-health")
  brainHealth(@Param("id") id: string) {
    return this.brain.computeBrainHealth(id);
  }

  /** Re-scan website + rebuild the Brand Brain (enqueues a worker job). */
  @Post(":id/sync")
  @HttpCode(202)
  async sync(@Param("id") id: string) {
    await this.brands.findOne(id); // 404 if missing
    const jobId = await this.buildQueue.enqueueBuild(id, false);
    return { queued: true, jobId };
  }
}
