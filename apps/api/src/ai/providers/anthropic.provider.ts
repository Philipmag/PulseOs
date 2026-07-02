import type { ChatMessage, CompletionResult, ModelProvider } from "../ai.types.js";

/**
 * Anthropic Messages API adapter. Uses fetch directly so no vendor SDK leaks
 * into the codebase — the ModelRouter is the only consumer.
 */
export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";
  private readonly endpoint = "https://api.anthropic.com/v1/messages";

  constructor(private readonly apiKey: string) {}

  async complete(
    model: string,
    messages: ChatMessage[],
    opts: { maxTokens: number; temperature: number },
  ): Promise<Omit<CompletionResult, "task" | "promptHash">> {
    // Anthropic takes `system` separately from the message list.
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        ...(system ? { system } : {}),
        messages: turns,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    return {
      text,
      model,
      provider: this.name,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    };
  }
}
