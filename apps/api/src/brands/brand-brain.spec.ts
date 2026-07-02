import {
  computeBrainHealthFromFields,
  toVectorLiteral,
} from "./brand-brain.util.js";
import { chunkText } from "./text-chunker.js";

const emptyFields = {
  name: "",
  websiteUrl: null,
  industry: null,
  companyDescription: null,
  products: null,
  targetAudience: null,
  toneAdjectives: null,
  competitors: null,
  objections: null,
  ctas: null,
  embeddingCount: 0,
};

describe("computeBrainHealthFromFields", () => {
  it("scores an empty brand at 0 and lists all fields missing", () => {
    const r = computeBrainHealthFromFields(emptyFields);
    expect(r.score).toBe(0);
    expect(r.present).toHaveLength(0);
    expect(r.missing).toContain("companyDescription");
  });

  it("scores a fully populated brand at 100", () => {
    const r = computeBrainHealthFromFields({
      name: "Acme",
      websiteUrl: "https://acme.com",
      industry: "SaaS",
      companyDescription: "A sufficiently long description of the brand.",
      products: [{ name: "P" }],
      targetAudience: [{ role: "CTO" }],
      toneAdjectives: ["bold", "clear", "technical"],
      competitors: [{ name: "C" }],
      objections: [{ objection: "x", response: "y" }],
      ctas: [{ label: "Buy", url: "https://acme.com/buy" }],
      embeddingCount: 12,
    });
    expect(r.score).toBe(100);
    expect(r.missing).toHaveLength(0);
  });

  it("is monotonic: adding a field never lowers the score", () => {
    const base = computeBrainHealthFromFields(emptyFields).score;
    const withName = computeBrainHealthFromFields({
      ...emptyFields,
      name: "Acme",
    }).score;
    expect(withName).toBeGreaterThanOrEqual(base);
  });
});

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("hello world")).toEqual(["hello world"]);
  });

  it("returns [] for empty/whitespace", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("produces overlapping chunks that cover the whole text", () => {
    const text = "a".repeat(10000);
    const chunks = chunkText(text, { chunkChars: 3200, overlapChars: 400 });
    expect(chunks.length).toBeGreaterThan(1);
    // Overlap => total characters across chunks exceeds original length.
    const totalChars = chunks.reduce((s, c) => s + c.length, 0);
    expect(totalChars).toBeGreaterThan(text.length);
  });
});

describe("toVectorLiteral", () => {
  it("formats a pgvector literal", () => {
    expect(toVectorLiteral([0.1, 0.2, -0.3])).toBe("[0.1,0.2,-0.3]");
  });

  it("rejects non-finite values (guards raw SQL)", () => {
    expect(() => toVectorLiteral([1, NaN])).toThrow(/non-finite/i);
    expect(() => toVectorLiteral([Infinity])).toThrow(/non-finite/i);
  });
});
