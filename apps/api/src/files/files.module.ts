import { Module } from "@nestjs/common";
import { FileExtractionService } from "./file-extraction.service.js";
import { FilesService } from "./files.service.js";
import { FilesController } from "./files.controller.js";
import { TranscriptionService } from "../ai/transcription.service.js";

@Module({
  controllers: [FilesController],
  providers: [FileExtractionService, FilesService, TranscriptionService],
  exports: [FileExtractionService],
})
export class FilesModule {}
