import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { type BrandFile } from "@pulseos/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { classifyFileType } from "./file-type.js";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB per file (spec)

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    brandId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ): Promise<BrandFile> {
    if (file.buffer.length > MAX_FILE_BYTES) {
      throw new NotFoundException("File exceeds the 25MB limit.");
    }
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, deletedAt: null },
    });
    if (!brand) throw new NotFoundException(`Brand ${brandId} not found`);

    const key = `brands/${brandId}/files/${randomUUID()}-${file.originalname}`;
    await this.storage.put(key, file.buffer, file.mimetype);

    return this.prisma.brandFile.create({
      data: {
        brandId,
        fileName: file.originalname,
        fileType: classifyFileType(file.originalname, file.mimetype),
        s3Key: key,
      },
    });
  }

  async remove(brandId: string, fileId: string): Promise<{ deleted: boolean; fileId: string }> {
    const file = await this.prisma.brandFile.findFirst({
      where: { id: fileId, brandId },
    });
    if (!file) throw new NotFoundException(`File ${fileId} not found`);

    // Remove embeddings derived from this file, then the row itself.
    if (file.embeddingIds.length > 0) {
      await this.prisma.brandEmbedding.deleteMany({
        where: { id: { in: file.embeddingIds } },
      });
    }
    await this.prisma.brandFile.delete({ where: { id: fileId } });
    return { deleted: true, fileId };
  }
}
