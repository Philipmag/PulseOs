import { ModelRouter } from "./model-router.service.js";
import type { ChatMessage } from "./ai.types.js";

describe("ModelRouter.hashPrompt", () => {
  const msgs: ChatMessage[] = [
    { role: "system", content: "You are a strategist." },
    { role: "user", content: "Write a plan." },
  ];

  it("is deterministic for identical prompts", () => {
    expect(ModelRouter.hashPrompt(msgs)).toBe(ModelRouter.hashPrompt(msgs));
  });

  it("changes when any message changes", () => {
    const other: ChatMessage[] = [
      msgs[0],
      { role: "user", content: "Write a different plan." },
    ];
    expect(ModelRouter.hashPrompt(msgs)).not.toBe(
      ModelRouter.hashPrompt(other),
    );
  });

  it("returns a 64-char hex SHA-256 digest", () => {
    expect(ModelRouter.hashPrompt(msgs)).toMatch(/^[a-f0-9]{64}$/);
  });
});
