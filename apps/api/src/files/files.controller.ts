import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FilesService } from "./files.service.js";

// Minimal shape of a multer file (avoids depending on Express.Multer typings).
interface UploadedFilePayload {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/**
 * Phase 4 file endpoints:
 *   POST   /brands/:id/files          upload asset to the Brand Brain
 *   DELETE /brands/:id/files/:fileId  remove asset + its embeddings
 */
@Controller("brands/:id/files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @Param("id") brandId: string,
    @UploadedFile() file: UploadedFilePayload,
  ) {
    return this.files.upload(brandId, file);
  }

  @Delete(":fileId")
  remove(@Param("id") brandId: string, @Param("fileId") fileId: string) {
    return this.files.remove(brandId, fileId);
  }
}
