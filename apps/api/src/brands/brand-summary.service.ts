import { Injectable } from "@nestjs/common";
import { ModelRouter } from "../ai/model-router.service.js";
import type { ChatMessage } from "../ai/ai.types.js";

export interface BrandSummaryInput {
  name: string;
  industry?: string | null;
  websiteUrl?: string | null;
  products?: unknown;
  targetAudience?: unknown;
  competitors?: unknown;
  toneAdjectives?: string[] | null;
  objections?: unknown;
  mission?: string | null;
  /** Representative excerpts from scraped site + uploaded files. */
  sourceExcerpts?: string[];
}

/**
 * Produces the ~500-word internal Brand Brain summary that every future AI call
 * in the system begins with (spec: brand_brain_initial_build step 6). Stored in
 * brands.company_description WITHOUT replacing the raw structured fields.
 */
@Injectable()
export class BrandSummaryService {
  constructor(private readonly models: ModelRouter) {}

  async generate(input: BrandSummaryInput): Promise<string> {
    const { text } = await this.models.complete({
      task: "brand_summary", // routes to the primary (long-context) model
      messages: buildSummaryPrompt(input),
      maxTokens: 1200,
      temperature: 0.4,
    });
    return text.trim();
  }
}

/** Pure prompt builder — testable without a model call. */
export function buildSummaryPrompt(input: BrandSummaryInput): ChatMessage[] {
  const j = (v: unknown): string =>
    v == null ? "(none provided)" : JSON.stringify(v, null, 2);

  const excerpts = (input.sourceExcerpts ?? [])
    .slice(0, 12)
    .map((e, i) => `--- excerpt ${i + 1} ---\n${e.slice(0, 1200)}`)
    .join("\n\n");

  const system =
    "You are the internal brand analyst for a marketing operating system. " +
    "You write a single authoritative brand briefing that every downstream AI " +
    "task reads before acting. Be concrete and specific to THIS brand; never " +
    "generic. Prefer the brand's own language.";

  const user = [
    `Write a ~500-word internal brand briefing for "${input.name}".`,
    "",
    "Cover, in flowing prose (not a bulleted list): what the company does and " +
      "who it serves; the core value propositions of its products; the target " +
      "audience segments and their primary pains; how it is positioned against " +
      "competitors; the brand voice; and the objections it must overcome.",
    "",
    `Industry: ${input.industry ?? "(unspecified)"}`,
    `Website: ${input.websiteUrl ?? "(none)"}`,
    `Mission: ${input.mission ?? "(none)"}`,
    `Tone adjectives: ${(input.toneAdjectives ?? []).join(", ") || "(none)"}`,
    `Products: ${j(input.products)}`,
    `Target audience: ${j(input.targetAudience)}`,
    `Competitors: ${j(input.competitors)}`,
    `Objections: ${j(input.objections)}`,
    excerpts ? `\nSource material excerpts:\n${excerpts}` : "",
    "",
    // Self-critique step (Execution Rule #8).
    "Before returning, review your briefing against three criteria and revise " +
      "if any is unmet: (A) is it specific to this brand rather than generic; " +
      "(B) does it accurately reflect the audience's actual pains; (C) is it " +
      "close to 500 words. Return only the final briefing.",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
