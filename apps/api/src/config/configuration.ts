import { z } from "zod";

/**
 * Fail-fast configuration. The app refuses to boot with a missing/invalid
 * critical variable rather than discovering it mid-request.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PROCESS_ROLE: z.enum(["api", "worker"]).default("api"),
  API_PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // AI — at least one provider key must be present for the ModelRouter to function.
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_KEY: z.string().optional(),
  MODEL_PRIMARY: z.string().default("claude-sonnet-4-6"),
  MODEL_SECONDARY: z.string().default("gpt-4o"),
  MODEL_EMBEDDING: z.string().default("text-embedding-3-large"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),

  // Encryption — required in production (Security Requirements / Execution Rule #4).
  ENCRYPTION_KEY: z.string().optional(),
  KMS_KEY_ID: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(): AppConfig {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const cfg = parsed.data;

  if (!cfg.ANTHROPIC_API_KEY && !cfg.OPENAI_API_KEY) {
    throw new Error(
      "At least one of ANTHROPIC_API_KEY or OPENAI_API_KEY must be set — the ModelRouter has no provider otherwise.",
    );
  }
  if (cfg.NODE_ENV === "production" && !cfg.ENCRYPTION_KEY) {
    throw new Error(
      "ENCRYPTION_KEY is required in production to encrypt platform OAuth tokens at rest.",
    );
  }

  return cfg;
}
