/**
 * Queue + job names. One queue per concern; job_type strings align with the
 * system_jobs.job_type values in the schema so tracking is consistent.
 */
export const QUEUES = {
  BRAND_BRAIN: "brand-brain",
  AUDIENCE_RESEARCH: "audience-research",
  OPPORTUNITY_SCORING: "opportunity-scoring",
  CONTENT_GENERATION: "content-generation",
  PUBLISHING: "publishing",
  ANALYTICS_POLLING: "analytics-polling",
} as const;

export const JOBS = {
  BRAND_BRAIN_INITIAL_BUILD: "brand_brain_initial_build",
  BRAND_BRAIN_UPDATE: "brand_brain_update",
} as const;

export interface BrandBrainBuildPayload {
  brandId: string;
  /** true on first build after wizard completion; false on re-sync. */
  initial: boolean;
}
