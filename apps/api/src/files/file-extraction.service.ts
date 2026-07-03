import { Injectable, Logger } from "@nestjs/common";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { TranscriptionService } from "../ai/transcription.service.js";
import { classifyFileType, type ExtractableType } from "./file-type.js";

/**
 * Extracts plain text from uploaded assets so the Brand Brain can embed them.
 * PDF → pdf-parse, DOCX → mammoth, audio/video → Whisper, text → utf-8.
 */
@Injectable()
export class FileExtractionService {
  private readonly logger = new Logger(FileExtractionService.name);

  constructor(private readonly transcription: TranscriptionService) {}

  async extract(
    buffer: Buffer,
    fileName: string,
    mimeType?: string,
  ): Promise<{ text: string; type: ExtractableType }> {
    const type = classifyFileType(fileName, mimeType);
    switch (type) {
      case "pdf": {
        const { text } = await pdfParse(buffer);
        return { text, type };
      }
      case "docx": {
        const { value } = await mammoth.extractRawText({ buffer });
        return { text: value, type };
      }
      case "text":
        return { text: buffer.toString("utf-8"), type };
      case "audio": {
        const text = await this.transcription.transcribe(buffer, fileName);
        return { text, type };
      }
      default:
        this.logger.warn(`Unsupported file type for ${fileName}; skipping.`);
        return { text: "", type };
    }
  }
}
