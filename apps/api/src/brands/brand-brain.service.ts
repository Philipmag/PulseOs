import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@pulseos/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { ModelRouter } from "../ai/model-router.service.js";
import { chunkText } from "./text-chunker.js";
import {
  computeBrainHealthFromFields,
  toVectorLiteral,
} from "./brand-brain.util.js";

/** The structured context injected into every AI prompt in the system. */
export interface BrandContext {
  brandId: string;
  summary: string | null;
  relevantChunks: Array<{ content: string; score: number; metadata: unknown }>;
  products: unknown;
  targetAudience: unknown;
  tone: string[];
  topPerformingTopics: unknown;
  topHooks: unknown;
  recentPainPoints: string[];
}

export type EmbeddingSourceType =
  | "onboarding"
  | "file"
  | "website"
  | "writing_sample"
  | "audience_intel"
  | "performance_feedback";

/**
 * BrandBrainService — the moat's read/write API.
 *
 * READ:  getContextForTask() assembles structured brand data + the top-k most
 *        relevant embedding chunks for a task. Every AI call goes through this
 *        (Execution Rule #2) so no model ever runs without brand context.
 * WRITE: ingestText() chunks, embeds, and stores content into the vector store,
 *        tagging source so the Learning Engine can weight it later.
 */
@Injectable()
export class BrandBrainService {
  private readonly logger = new Logger(BrandBrainService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly models: ModelRouter,
  ) {}

  async getContextForTask(
    brandId: string,
    _taskType: string,
    taskContext: string,
    topK = 10,
  ): Promise<BrandContext> {
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, deletedAt: null },
    });
    if (!brand) {
      throw new Error(`Brand ${brandId} not found`);
    }

    // Vector search. Falls back to an empty chunk list if embedding fails or the
    // brand has no embeddings yet (fresh onboarding) — never blocks the caller.
    let relevantChunks: BrandContext["relevantChunks"] = [];
    try {
      const { vectors } = await this.models.embed([taskContext]);
      const queryVec = vectors[0];
      if (queryVec) {
        relevantChunks = await this.searchEmbeddings(brandId, queryVec, topK);
      }
    } catch (err) {
      this.logger.warn(
        `Embedding retrieval failed for brand ${brandId}; proceeding without chunks: ${
          (err as Error).message
        }`,
      );
    }

    const painPoints = Array.isArray(brand.audiencePainPoints)
      ? (brand.audiencePainPoints as unknown[])
          .slice(0, 5)
          .map((p) =>
            typeof p === "string"
              ? p
              : ((p as { text?: string }).text ?? JSON.stringify(p)),
          )
      : [];

    return {
      brandId,
      summary: brand.companyDescription,
      relevantChunks,
      products: brand.products,
      targetAudience: brand.targetAudience,
      tone: brand.toneAdjectives ?? [],
      topPerformingTopics: brand.topPerformingTopics,
      topHooks: brand.topPerformingHooks,
      recentPainPoints: painPoints,
    };
  }

  /**
   * Cosine-similarity search over brand_embeddings. The embedding column is a
   * pgvector `vector` type (Unsupported in Prisma), so we drop to raw SQL. The
   * vector literal is built from model-produced finite numbers (not user input)
   * and validated; brandId is parameterised.
   */
  private async searchEmbeddings(
    brandId: string,
    queryVec: number[],
    topK: number,
  ): Promise<BrandContext["relevantChunks"]> {
    const literal = toVectorLiteral(queryVec);
    const rows = await this.prisma.$queryRaw<
      Array<{ content_chunk: string; metadata: unknown; score: number }>
    >(Prisma.sql`
      SELECT content_chunk, metadata,
             1 - (embedding <=> ${literal}::vector) AS score
      FROM brand_embeddings
      WHERE brand_id = ${brandId}::uuid AND embedding IS NOT NULL
      ORDER BY embedding <=> ${literal}::vector
      LIMIT ${topK}
    `);
    return rows.map((r) => ({
      content: r.content_chunk,
      score: Number(r.score),
      metadata: r.metadata,
    }));
  }

  /**
   * Chunk → embed → store. Returns the created embedding row ids so callers
   * (brand_files, website scrape, writing samples) can back-reference them.
   */
  async ingestText(
    brandId: string,
    text: string,
    sourceType: EmbeddingSourceType,
    sourceId?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<string[]> {
    const chunks = chunkText(text);
    if (chunks.length === 0) return [];

    const { vectors } = await this.models.embed(chunks);
    const ids: string[] = [];

    // Insert one row per chunk. Raw SQL because of the vector column.
    for (let i = 0; i < chunks.length; i++) {
      const vec = vectors[i];
      const chunk = chunks[i];
      if (!vec || chunk === undefined) continue;
      const literal = toVectorLiteral(vec);
      const [row] = await this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          INSERT INTO brand_embeddings
            (brand_id, source_type, source_id, content_chunk, embedding, metadata)
          VALUES (
            ${brandId}::uuid, ${sourceType}, ${sourceId ?? null}::uuid,
            ${chunk}, ${literal}::vector, ${JSON.stringify(metadata ?? {})}::jsonb
          )
          RETURNING id
        `,
      );
      if (row) ids.push(row.id);
    }

    this.logger.log(
      `Ingested ${ids.length} chunks for brand ${brandId} (source=${sourceType})`,
    );
    return ids;
  }

  /**
   * Brain-health completeness (0–100) + the list of missing fields, powering the
   * onboarding checklist and the "Brain health" dashboard indicator.
   */
  async computeBrainHealth(
    brandId: string,
  ): Promise<{ score: number; missing: string[]; present: string[] }> {
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, deletedAt: null },
    });
    if (!brand) throw new Error(`Brand ${brandId} not found`);

    const embeddingCount = await this.prisma.brandEmbedding.count({
      where: { brandId },
    });

    return computeBrainHealthFromFields({
      name: brand.name,
      websiteUrl: brand.websiteUrl,
      industry: brand.industry,
      companyDescription: brand.companyDescription,
      products: brand.products,
      targetAudience: brand.targetAudience,
      toneAdjectives: brand.toneAdjectives,
      competitors: brand.competitors,
      objections: brand.objections,
      ctas: brand.ctas,
      embeddingCount,
    });
  }
}
