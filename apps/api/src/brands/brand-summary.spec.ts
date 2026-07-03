import { buildSummaryPrompt } from "./brand-summary.service.js";

describe("buildSummaryPrompt", () => {
  const base = {
    name: "Acme",
    industry: "SaaS",
    toneAdjectives: ["bold", "clear"],
    products: [{ name: "Widget" }],
  };

  it("includes a system + user message", () => {
    const msgs = buildSummaryPrompt(base);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  it("embeds the brand name and a self-critique instruction (Rule #8)", () => {
    const user = buildSummaryPrompt(base)[1].content;
    expect(user).toContain("Acme");
    expect(user.toLowerCase()).toContain("before returning");
    expect(user).toContain("500");
  });

  it("caps and includes source excerpts", () => {
    const msgs = buildSummaryPrompt({
      ...base,
      sourceExcerpts: Array.from({ length: 20 }, (_, i) => `excerpt ${i}`),
    });
    const user = msgs[1].content;
    expect(user).toContain("excerpt 0");
    // Only the first 12 excerpts are included.
    expect(user).not.toContain("excerpt 15");
  });
});
