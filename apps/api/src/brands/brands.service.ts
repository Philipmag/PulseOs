import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@pulseos/database";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateBrandInput, UpdateBrandInput } from "./dto/brand.dto.js";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateBrandInput) {
    return this.prisma.brand.create({
      data: {
        userId,
        name: input.name,
        websiteUrl: input.websiteUrl ?? null,
        industry: input.industry ?? null,
      },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }

  async update(id: string, input: UpdateBrandInput) {
    await this.findOne(id); // 404 if missing/soft-deleted

    // Any structured-data update bumps brain_version so the moat's freshness is
    // tracked (mirrors the Learning Engine's version increments).
    const data: Prisma.BrandUpdateInput = {
      ...input,
      products: toJson(input.products),
      targetAudience: toJson(input.targetAudience),
      competitors: toJson(input.competitors),
      ctas: toJson(input.ctas),
      faqs: toJson(input.faqs),
      objections: toJson(input.objections),
      brainVersion: { increment: 1 },
      lastSyncedAt: new Date(),
    };

    return this.prisma.brand.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

/** Undefined stays undefined (no-op update); arrays become Prisma JSON input. */
function toJson(
  v: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}
