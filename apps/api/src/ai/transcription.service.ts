import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../config/configuration.js";

/**
 * Whisper transcription (audio/video → text) for uploaded sales calls, product
 * demos, etc. Kept alongside the ModelRouter so business logic never talks to
 * OpenAI directly (Execution Rule #5). Separated into its own service because the
 * request is multipart, unlike the JSON chat/embedding calls.
 */
@Injectable()
export class TranscriptionService {
  private readonly apiKey: string | undefined;
  private readonly endpoint = "https://api.openai.com/v1/audio/transcriptions";

  constructor(config: ConfigService<AppConfig, true>) {
    this.apiKey = config.get<string>("OPENAI_API_KEY");
  }

  async transcribe(
    audio: Buffer,
    fileName: string,
    model = "whisper-1",
  ): Promise<string> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY not configured.");

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(audio)]),
      fileName || "audio.mp3",
    );
    form.append("model", model);
    form.append("response_format", "text");

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Whisper ${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.text()).trim();
  }
}
