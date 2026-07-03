import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { retry } from "../common/retry.js";

export interface ScrapeResult {
  url: string;
  markdown: string;
  title?: string;
}

/**
 * Firecrawl adapter (website scraping for Brand Brain intake + later competitor
 * intelligence). Uses the synchronous single-page /scrape endpoint. Rate-limit
 * and transient errors are retried with backoff (Execution Rule #6).
 */
@Injectable()
export class FirecrawlClient {
  private readonly logger = new Logger(FirecrawlClient.name);
  private readonly base = "https://api.firecrawl.dev/v1";
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>("FIRECRAWL_API_KEY");
  }

  get configured(): boolean {
    return !!this.apiKey;
  }

  async scrape(url: string): Promise<ScrapeResult> {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY not configured.");

    return retry(
      async () => {
        const res = await fetch(`${this.base}/scrape`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ url, formats: ["markdown"] }),
        });

        if (res.status === 429 || res.status >= 500) {
          throw new Error(`Firecrawl transient ${res.status}`);
        }
        if (!res.ok) {
          const body = await res.text();
          // Non-retryable client error — surface immediately.
          const err = new Error(`Firecrawl ${res.status}: ${body.slice(0, 300)}`);
          (err as { fatal?: boolean }).fatal = true;
          throw err;
        }

        const data = (await res.json()) as {
          success: boolean;
          data?: { markdown?: string; metadata?: { title?: string } };
        };
        return {
          url,
          markdown: data.data?.markdown ?? "",
          title: data.data?.metadata?.title,
        };
      },
      {
        retries: 4,
        delayMs: 2000,
        backoff: 2,
        shouldRetry: (e) => !(e as { fatal?: boolean }).fatal,
        onRetry: (n, e) =>
          this.logger.warn(`Firecrawl retry ${n}: ${(e as Error).message}`),
      },
    );
  }
}
