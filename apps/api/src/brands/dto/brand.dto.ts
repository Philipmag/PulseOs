import { z } from "zod";

// Mirrors the Module 1 onboarding wizard structure. All rich fields are optional
// at creation time — the wizard fills them across 6 steps and background jobs.

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.string().optional(),
  cta: z.string().optional(),
  ctaUrl: z.string().url().optional(),
});

const icpSegmentSchema = z.object({
  role: z.string().min(1),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  primaryChallenge: z.string().optional(),
  successLooksLike: z.string().optional(),
  whereOnline: z.array(z.string()).default([]),
});

const competitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  notes: z.string().optional(),
});

const objectionSchema = z.object({
  objection: z.string().min(1),
  response: z.string().min(1),
});

const ctaSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  context: z.string().optional(),
});

const faqSchema = z.object({ q: z.string().min(1), a: z.string().min(1) });

export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  websiteUrl: z.string().url().optional(),
  industry: z.string().optional(),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z
  .object({
    name: z.string().min(1).optional(),
    websiteUrl: z.string().url().optional(),
    industry: z.string().optional(),
    companyDescription: z.string().optional(),
    mission: z.string().optional(),
    products: z.array(productSchema).max(20).optional(),
    targetAudience: z.array(icpSegmentSchema).min(1).max(5).optional(),
    competitors: z.array(competitorSchema).max(10).optional(),
    toneAdjectives: z.array(z.string()).min(3).max(5).optional(),
    ctas: z.array(ctaSchema).optional(),
    faqs: z.array(faqSchema).optional(),
    objections: z.array(objectionSchema).min(3).optional(),
  })
  .strict();
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
