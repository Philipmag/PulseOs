# @pulseos/api

NestJS backend. Boots in two roles from one codebase:

- `PROCESS_ROLE=api` (default) — HTTP API under `/api/v1`
- `PROCESS_ROLE=worker` — DI context for BullMQ processors (added with job modules)

## Foundational modules (Phase 1)

- `config/` — zod-validated, fail-fast environment configuration
- `crypto/` — AES-256-GCM encryption for OAuth tokens at rest
- `prisma/` — Prisma client lifecycle
- `ai/` — **ModelRouter**: the single entry point for all model calls, with
  Anthropic + OpenAI provider adapters behind a common interface
- `health/` — liveness + DB reachability probe

## Test

```bash
pnpm --filter @pulseos/api test
```
