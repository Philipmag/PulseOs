import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { AppConfig } from "../config/configuration.js";

/**
 * AES-256-GCM encryption for OAuth tokens at rest (Security Requirements,
 * Execution Rule #4). Ciphertext format (all base64, dot-separated):
 *
 *     iv.authTag.ciphertext
 *
 * The key comes from ENCRYPTION_KEY (base64, 32 bytes). In production this key
 * should be delivered by KMS (KMS_KEY_ID) rather than a raw env var; the
 * interface here is the seam where that swap happens.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = "aes-256-gcm" as const;
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const raw = this.config.get<string>("ENCRYPTION_KEY");
    if (!raw) {
      // Non-production convenience: derive an ephemeral key so local dev boots.
      // Tokens encrypted with an ephemeral key do NOT survive a restart — by design.
      this.logger.warn(
        "ENCRYPTION_KEY not set — using an ephemeral in-memory key (dev only).",
      );
      this.key = randomBytes(32);
      return;
    }
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length !== 32) {
      throw new Error(
        "ENCRYPTION_KEY must be a base64-encoded 256-bit (32-byte) key.",
      );
    }
    this.key = decoded;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12); // 96-bit nonce, recommended for GCM
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString("base64"),
      authTag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(".");
  }

  decrypt(payload: string): string {
    const parts = payload.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed ciphertext.");
    }
    const [ivB64, tagB64, dataB64] = parts as [string, string, string];
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const ciphertext = Buffer.from(dataB64, "base64");

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  }

  /** Constant-time comparison helper for secrets (e.g. webhook signatures). */
  safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
