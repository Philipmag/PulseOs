/**
 * Task types map a unit of AI work to a model tier. Every AI call in PulseOS is
 * classified by TaskType so the ModelRouter — not business logic — decides which
 * model runs it. Adding a task here is how you introduce new AI-backed features.
 */
export type TaskType =
  | "brand_summary" // long-context synthesis of the Brand Brain → primary
  | "audience_extraction" // structured insight extraction from scraped text
  | "opportunity_reasoning"
  | "strategy_generation" // slow, high-value, long-context → primary
  | "content_generation" // fast first drafts → secondary
  | "content_refinement" // editor "make shorter", "rephrase", etc.
  | "performance_analysis"
  | "embedding";

export type ModelTier = "primary" | "secondary";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  task: TaskType;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Force a specific tier, overriding the task→tier default. */
  tierOverride?: ModelTier;
}

export interface CompletionResult {
  text: string;
  model: string;
  provider: string;
  usage: { inputTokens: number; outputTokens: number };
  /** SHA-256 of the fully rendered prompt — persisted to content_items.generation_prompt_hash. */
  promptHash: string;
}

export interface EmbeddingResult {
  vectors: number[][];
  model: string;
  dimensions: number;
}

/**
 * A provider adapter. Concrete adapters (Anthropic, OpenAI, Gemini) implement
 * this so the ModelRouter never imports a vendor SDK directly (Execution Rule #5).
 */
export interface ModelProvider {
  readonly name: string;
  complete(
    model: string,
    messages: ChatMessage[],
    opts: { maxTokens: number; temperature: number },
  ): Promise<Omit<CompletionResult, "task" | "promptHash">>;
  embed?(model: string, inputs: string[], dimensions: number): Promise<number[][]>;
}
