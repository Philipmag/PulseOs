import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service.js";
import { SystemJobsService } from "./system-jobs.service.js";
import { BrandBrainService } from "../brands/brand-brain.service.js";
import { BrandSummaryService } from "../brands/brand-summary.service.js";
import { FileExtractionService } from "../files/file-extraction.service.js";
import { StorageService } from "../storage/storage.service.js";
import { FirecrawlClient } from "../research/firecrawl.client.js";
import { QUEUES, type BrandBrainBuildPayload } from "../queue/queue.constants.js";

/**
 * brand_brain_initial_build (spec, Module 1). Runs on wizard completion and on
 * re-sync. Pulls the website scrape + uploaded files, embeds everything, then
 * generates the authoritative brand summary. Progress is streamed to system_jobs
 * so the onboarding interstitial can show honest status.
 *
 * Only instantiated in the worker role (see JobsModule) so the API process never
 * consumes jobs — it only enqueues.
 */
@Processor(QUEUES.BRAND_BRAIN)
export class BrandBrainBuildProcessor extends WorkerHost {
  private readonly logger = new Logger(BrandBrainBuildProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: SystemJobsService,
    private readonly brain: BrandBrainService,
    private readonly summaries: BrandSummaryService,
    private readonly extraction: FileExtractionService,
    private readonly storage: StorageService,
    private readonly firecrawl: FirecrawlClient,
  ) {
    super();
  }

  async process(job: Job<BrandBrainBuildPayload>): Promise<{ chunks: number }> {
    const { brandId } = job.data;
    const tracked = await this.jobs.start("brand_brain_update", brandId, {
      queueJobId: job.id ?? null,
      initial: job.data.initial,
    });

    try {
      const brand = await this.prisma.brand.findFirstOrThrow({
        where: { id: brandId, deletedAt: null },
      });
      const excerpts: string[] = [];
      let chunkCount = 0;

      // 1) Website scrape → embed (best-effort; never blocks the build).
      await this.jobs.progress(tracked.id, 10);
      if (brand.websiteUrl && this.firecrawl.configured) {
        try {
          const scraped = await this.firecrawl.scrape(brand.websiteUrl);
          if (scraped.markdown) {
            const ids = await this.brain.ingestText(
              brandId,
              scraped.markdown,
              "website",
              undefined,
              { url: scraped.url, title: scraped.title ?? null },
            );
            chunkCount += ids.length;
            excerpts.push(scraped.markdown);
            await this.prisma.brand.update({
              where: { id: brandId },
              data: { lastSyncedAt: new Date() },
            });
          }
        } catch (err) {
          this.logger.warn(
            `Website scrape failed for ${brandId}: ${(err as Error).message}`,
          );
        }
      }

      // 2) Uploaded files → extract → embed.
      await this.jobs.progress(tracked.id, 40);
      const files = await this.prisma.brandFile.findMany({
        where: { brandId },
      });
      for (const file of files) {
        try {
          const bytes = await this.storage.get(file.s3Key);
          const { text } = await this.extraction.extract(
            bytes,
            file.fileName,
            file.fileType ?? undefined,
          );
          if (!text) continue;
          const ids = await this.brain.ingestText(brandId, text, "file", file.id);
          chunkCount += ids.length;
          excerpts.push(text);
          await this.prisma.brandFile.update({
            where: { id: file.id },
            data: { extractedText: text, embeddingIds: ids },
          });
        } catch (err) {
          this.logger.warn(
            `File extraction failed (${file.fileName}): ${(err as Error).message}`,
          );
        }
      }

      // 3) Structured onboarding data → embed (so raw fields are retrievable too).
      await this.jobs.progress(tracked.id, 65);
      const onboardingText = serializeOnboarding(brand);
      if (onboardingText.trim().length > 0) {
        const ids = await this.brain.ingestText(
          brandId,
          onboardingText,
          "onboarding",
        );
        chunkCount += ids.length;
      }

      // 4) Generate the authoritative summary → brands.company_description.
      await this.jobs.progress(tracked.id, 85);
      const summary = await this.summaries.generate({
        name: brand.name,
        industry: brand.industry,
        websiteUrl: brand.websiteUrl,
        products: brand.products,
        targetAudience: brand.targetAudience,
        competitors: brand.competitors,
        toneAdjectives: brand.toneAdjectives,
        objections: brand.objections,
        mission: brand.mission,
        sourceExcerpts: excerpts,
      });

      await this.prisma.brand.update({
        where: { id: brandId },
        data: {
          companyDescription: summary,
          brainVersion: job.data.initial ? 1 : { increment: 1 },
          lastSyncedAt: new Date(),
        },
      });

      await this.jobs.complete(tracked.id, { chunks: chunkCount });
      this.logger.log(
        `Brand Brain built for ${brandId}: ${chunkCount} chunks embedded.`,
      );
      return { chunks: chunkCount };
    } catch (err) {
      await this.jobs.fail(tracked.id, (err as Error).message);
      throw err;
    }
  }
}

/** Flattens structured onboarding fields into embeddable prose. */
function serializeOnboarding(brand: {
  name: string;
  mission: string | null;
  products: unknown;
  targetAudience: unknown;
  competitors: unknown;
  objections: unknown;
  faqs: unknown;
}): string {
  const parts: string[] = [`Brand: ${brand.name}`];
  if (brand.mission) parts.push(`Mission: ${brand.mission}`);
  const dump = (label: string, v: unknown): void => {
    if (v != null && (!Array.isArray(v) || v.length > 0)) {
      parts.push(`${label}: ${JSON.stringify(v)}`);
    }
  };
  dump("Products", brand.products);
  dump("Target audience", brand.targetAudience);
  dump("Competitors", brand.competitors);
  dump("Objections", brand.objections);
  dump("FAQs", brand.faqs);
  return parts.join("\n\n");
}
