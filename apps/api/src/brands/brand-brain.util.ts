/**
 * Pure Brand Brain helpers — no NestJS/Prisma imports so they are trivially
 * testable and reusable by the frontend wizard (live brain-health preview).
 */

/** Builds a validated pgvector literal `[a,b,c]` from finite numbers. */
export function toVectorLiteral(vec: number[]): string {
  for (const n of vec) {
    if (!Number.isFinite(n)) throw new Error("Non-finite value in embedding.");
  }
  return `[${vec.join(",")}]`;
}

export interface BrainHealthFields {
  name: string;
  websiteUrl: string | null;
  industry: string | null;
  companyDescription: string | null;
  products: unknown;
  targetAudience: unknown;
  toneAdjectives: string[] | null;
  competitors: unknown;
  objections: unknown;
  ctas: unknown;
  embeddingCount: number;
}

/** Weighted completeness score (0–100) plus present/missing field lists. */
export function computeBrainHealthFromFields(f: BrainHealthFields): {
  score: number;
  missing: string[];
  present: string[];
} {
  const nonEmptyArray = (v: unknown): boolean =>
    Array.isArray(v) && v.length > 0;

  const checks: Array<{ key: string; weight: number; ok: boolean }> = [
    { key: "name", weight: 5, ok: f.name.trim().length > 0 },
    { key: "websiteUrl", weight: 10, ok: !!f.websiteUrl },
    { key: "industry", weight: 5, ok: !!f.industry },
    {
      key: "companyDescription",
      weight: 15,
      ok: !!f.companyDescription && f.companyDescription.length > 20,
    },
    { key: "products", weight: 15, ok: nonEmptyArray(f.products) },
    { key: "targetAudience", weight: 15, ok: nonEmptyArray(f.targetAudience) },
    { key: "toneAdjectives", weight: 10, ok: nonEmptyArray(f.toneAdjectives) },
    { key: "competitors", weight: 5, ok: nonEmptyArray(f.competitors) },
    { key: "objections", weight: 5, ok: nonEmptyArray(f.objections) },
    { key: "ctas", weight: 5, ok: nonEmptyArray(f.ctas) },
    { key: "uploadedAssets", weight: 10, ok: f.embeddingCount > 0 },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.ok).reduce((s, c) => s + c.weight, 0);

  return {
    score: Math.round((earned / total) * 100),
    missing: checks.filter((c) => !c.ok).map((c) => c.key),
    present: checks.filter((c) => c.ok).map((c) => c.key),
  };
}
