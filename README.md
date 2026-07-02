# PulseOS

An AI **Marketing Operating System** for solo founders, indie hackers, SaaS
startups, agencies, and small B2B companies who need the output of a content team
without hiring one.

> This is not a writing assistant or a content generator. The AI researches what
> to say, decides what to build, creates it, publishes it, measures results, and
> improves the next cycle — automatically.

## The moat

The durable advantage is **not** the AI models (any competitor can call the same
APIs). It is the **Brand Brain** — accumulated proprietary data about each
customer's brand, audience, and performance that grows more valuable with use and
cannot be replicated by switching tools. Every architecture decision serves that
moat. See the specification for the three defensibility tests each module must pass.

## Core loop

```
Research → Strategy → Create → Publish → Measure → Learn → (better) Research …
```

## Tech stack

| Layer      | Choice                                                              |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | Next.js 15 (App Router), TypeScript strict, Tailwind + shadcn/ui   |
| Backend    | NestJS, PostgreSQL + pgvector, Redis, BullMQ, Temporal, Prisma     |
| AI         | Claude Sonnet (primary), GPT-4o (secondary), text-embedding-3-large |
| Vector     | pgvector in Postgres (no separate vector DB at MVP scale)          |
| Infra      | Vercel, Railway, Neon, Upstash, Cloudflare R2, Stripe, Clerk       |

Every AI call routes through **`ModelRouter`** — models are swappable via env vars,
never hard-coded into business logic (Execution Rule #5).

## Monorepo layout

```
apps/
  api/                NestJS API + worker (one codebase, PROCESS_ROLE selects role)
  web/                Next.js frontend (added with Module 1 onboarding UI)
packages/
  database/           Prisma schema + client (@pulseos/database)
```

## Getting started (local)

```bash
pnpm install
cp .env.example .env          # fill in keys; NEVER commit .env
pnpm infra:up                 # postgres+pgvector, redis, minio, temporal
pnpm db:generate
pnpm db:migrate               # applies schema + pgvector index migration
pnpm --filter @pulseos/api start:dev
```

Requires network access to `binaries.prisma.sh` for Prisma engine downloads and a
running Postgres with the `vector` extension available.

## Build status

Foundation-first, one module fully complete before the next (Execution Rule #1).

- [x] **Phase 1 — Foundation**: monorepo, full Prisma schema (14 tables),
      `ModelRouter` + provider adapters, AES-256-GCM token encryption, config
      validation, health check, first unit tests.
- [ ] **Module 1 — Brand Brain** *(in progress)*
- [ ] Module 2 — Audience Intelligence
- [ ] Module 3 — Opportunity Finder
- [ ] Module 4 — Strategy Engine
- [ ] Module 5 — AI Content Factory
- [ ] Module 6 — Publishing Hub
- [ ] Module 7 — Analytics Brain
- [ ] Module 8 — Learning Engine

## Notable spec corrections

- **Embedding dimensions**: `text-embedding-3-large` emits 3072-dim vectors, but
  pgvector ANN indexes cap at 2000 dims — the spec's `vector(3072)` + `ivfflat`
  combination fails. Resolved by requesting 1536-dim embeddings. Details in
  [`packages/database/NOTES.md`](packages/database/NOTES.md).
