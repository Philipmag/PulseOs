import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import type { AppConfig } from "../config/configuration.js";
import { AnthropicProvider } from "./providers/anthropic.provider.js";
import { OpenAIProvider } from "./providers/openai.provider.js";
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResult,
  EmbeddingResult,
  ModelProvider,
  ModelTier,
  TaskType,
} from "./ai.types.js";

/**
 * ModelRouter — THE ONLY entry point for AI model calls in PulseOS (Execution
 * Rule #5). Business logic imports this, never a vendor SDK. Swapping models is
 * a config change (MODEL_PRIMARY / MODEL_SECONDARY), not a code change.
 *
 * Task → tier defaults implement the spec's division of labour:
 *   primary   (Claude Sonnet)  — long-context, nuanced brand voice, strategy
 *   secondary (GPT-4o)         — fast generation, structured extraction
 */
@Injectable()
export class ModelRouter {
  private readonly logger = new Logger(ModelRouter.name);
  private readonly providers = new Map<string, ModelProvider>();
  private readonly primaryModel: string;
  private readonly secondaryModel: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimensions: number;

  private static readonly TASK_TIER: Record<TaskType, ModelTier> = {
    brand_summary: "primary",
    strategy_generation: "primary",
    performance_analysis: "primary",
    audience_extraction: "secondary",
    opportunity_reasoning: "secondary",
    content_generation: "secondary",
    content_refinement: "secondary",
    embedding: "secondary",
  };

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const anthropicKey = this.config.get<string>("ANTHROPIC_API_KEY");
    const openaiKey = this.config.get<string>("OPENAI_API_KEY");

    if (anthropicKey) {
      this.providers.set("anthropic", new AnthropicProvider(anthropicKey));
    }
    if (openaiKey) {
      this.providers.set("openai", new OpenAIProvider(openaiKey));
    }

    this.primaryModel = this.config.get<string>("MODEL_PRIMARY") ?? "claude-sonnet-4-6";
    this.secondaryModel = this.config.get<string>("MODEL_SECONDARY") ?? "gpt-4o";
    this.embeddingModel =
      this.config.get<string>("MODEL_EMBEDDING") ?? "text-embedding-3-large";
    this.embeddingDimensions =
      this.config.get<number>("EMBEDDING_DIMENSIONS") ?? 1536;
  }

  /** Run a completion. Returns text plus a prompt hash for provenance tracking. */
  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const tier = req.tierOverride ?? ModelRouter.TASK_TIER[req.task];
    const { provider, model } = this.resolve(tier);

    const promptHash = ModelRouter.hashPrompt(req.messages);
    const started = Date.now();

    const result = await provider.complete(model, req.messages, {
      maxTokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.7,
    });

    this.logger.debug(
      `task=${req.task} tier=${tier} model=${model} ` +
        `in=${result.usage.inputTokens} out=${result.usage.outputTokens} ` +
        `ms=${Date.now() - started}`,
    );

    return { ...result, promptHash };
  }

  /**
   * Completion constrained to JSON. Many modules (audience extraction, strategy,
   * SEO metadata) need structured output; this centralises the parse + repair.
   */
  async completeStructured<T>(req: CompletionRequest): Promise<T> {
    const guarded: ChatMessage[] = [
      ...req.messages,
      {
        role: "system",
        content:
          "Return ONLY valid JSON. No markdown fences, no prose before or after.",
      },
    ];
    const { text } = await this.complete({ ...req, messages: guarded });
    return ModelRouter.parseJson<T>(text);
  }

  /** Embed one or more texts. Dimension is pinned by config for pgvector index fit. */
  async embed(inputs: string[]): Promise<EmbeddingResult> {
    // Embeddings currently only via OpenAI provider.
    const provider = this.providers.get("openai");
    if (!provider?.embed) {
      throw new Error(
        "No embedding-capable provider configured (OPENAI_API_KEY required).",
      );
    }
    const vectors = await provider.embed(
      this.embeddingModel,
      inputs,
      this.embeddingDimensions,
    );
    return {
      vectors,
      model: this.embeddingModel,
      dimensions: this.embeddingDimensions,
    };
  }

  private resolve(tier: ModelTier): { provider: ModelProvider; model: string } {
    if (tier === "primary") {
      const provider =
        this.providers.get("anthropic") ?? this.providers.get("openai");
      if (!provider) throw new Error("No provider available for primary tier.");
      const model = provider.name === "anthropic"
        ? this.primaryModel
        : this.secondaryModel;
      return { provider, model };
    }
    const provider =
      this.providers.get("openai") ?? this.providers.get("anthropic");
    if (!provider) throw new Error("No provider available for secondary tier.");
    const model = provider.name === "openai"
      ? this.secondaryModel
      : this.primaryModel;
    return { provider, model };
  }

  static hashPrompt(messages: ChatMessage[]): string {
    const canonical = messages
      .map((m) => `${m.role}:${m.content}`)
      .join("\n---\n");
    return createHash("sha256").update(canonical).digest("hex");
  }

  private static parseJson<T>(text: string): T {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Best-effort: grab the outermost JSON object/array.
      const match = cleaned.match(/[{[][\s\S]*[}\]]/);
      if (match) return JSON.parse(match[0]) as T;
      throw new Error("Model did not return parseable JSON.");
    }
  }
}
