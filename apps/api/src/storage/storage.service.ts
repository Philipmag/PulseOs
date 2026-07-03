import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Object storage (Cloudflare R2 in prod, MinIO locally — both S3-compatible).
 * Stores/reads uploaded brand assets referenced by brand_files.s3_key.
 */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>("S3_BUCKET") ?? "pulseos-assets";
    this.client = new S3Client({
      region: config.get<string>("S3_REGION") ?? "auto",
      endpoint: config.get<string>("S3_ENDPOINT"),
      forcePathStyle: true, // required for MinIO / R2
      credentials: {
        accessKeyId: config.get<string>("AWS_ACCESS_KEY_ID") ?? "",
        secretAccessKey: config.get<string>("AWS_SECRET_ACCESS_KEY") ?? "",
      },
    });
  }

  async put(key: string, body: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Empty object at ${key}`);
    return Buffer.from(bytes);
  }
}
