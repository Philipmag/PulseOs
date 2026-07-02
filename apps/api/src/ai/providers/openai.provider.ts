import type { ChatMessage, CompletionResult, ModelProvider } from "../ai.types.js";

/**
 * OpenAI adapter for chat completions and embeddings. The `dimensions` parameter
 * on the embeddings call is how we get text-embedding-3-large down to 1536 dims
 * so pgvector can index it (see packages/database/NOTES.md).
 */
export class OpenAIProvider implements ModelProvider {
  readonly name = "openai";
  private readonly base = "https://api.openai.com/v1";

  constructor(private readonly apiKey: string) {}

  async complete(
    model: string,
    messages: ChatMessage[],
    opts: { maxTokens: number; temperature: number },
  ): Promise<Omit<CompletionResult, "task" | "promptHash">> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string | null } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      text: data.choices[0]?.message.content ?? "",
      model,
      provider: this.name,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
    };
  }

  async embed(
    model: string,
    inputs: string[],
    dimensions: number,
  ): Promise<number[][]> {
    const res = await fetch(`${this.base}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, input: inputs, dimensions }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    // Preserve input order.
    return data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}
