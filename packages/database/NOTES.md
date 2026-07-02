# Database notes

## Embedding dimensions — a spec correction worth knowing

The spec defines the Brand Brain vector column as:

```sql
embedding vector(3072),   -- text-embedding-3-large dimension
CREATE INDEX ON brand_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**This exact combination does not work.** `text-embedding-3-large` emits **3072-dim**
vectors, but pgvector's approximate-nearest-neighbour indexes (`ivfflat` and `hnsw`)
only index vectors up to **2000 dimensions**. Creating an ivfflat index on a
`vector(3072)` column fails at migration time. Since Module 3's opportunity scoring and
`BrandBrainService.getContextForTask` both depend on fast similarity search, an unindexed
3072-dim column would force sequential scans and blow the "< 500ms p99" benchmark in Phase 5.

Three viable fixes:

1. **Request fewer dimensions from OpenAI (chosen).** `text-embedding-3-large` supports a
   `dimensions` parameter; 1536 retains almost all retrieval quality (OpenAI's own
   benchmarks show negligible MTEB loss down to 1536/1024) and fits comfortably under the
   2000-dim ceiling. `EMBEDDING_DIMENSIONS=1536` is set in `.env.example` and the column is
   `vector(1536)`.
2. Store the full `vector(3072)` and use `halfvec(3072)` for the index (pgvector ≥ 0.7
   indexes halfvec up to 4000 dims). Higher fidelity, more storage, slightly more setup.
3. Store `vector(3072)` with no ANN index and do exact search. Correct but slow at scale.

If you'd rather keep full 3072-dim fidelity, switch to option 2 — it's a column-type and
index change only; nothing in the application code assumes a specific dimension beyond the
`EMBEDDING_DIMENSIONS` env var and the `ModelRouter.embed()` call.

## ivfflat vs hnsw

The spec asked for `ivfflat (lists = 100)`. This scaffold uses **hnsw** instead: it needs
no training pass, tolerates incremental inserts (the Learning Engine adds embeddings
continuously), and generally gives better recall/latency at this scale. ivfflat remains a
fine choice if you want lower index build memory.

## Why the vector column lives in a raw SQL migration

Prisma (as of v6) can't express `vector(n)` columns or ANN indexes in `schema.prisma`. The
column is declared as `Unsupported("vector(1536)")` so the generated client stays type-safe
everywhere else, and the real column type + index are applied by
`prisma/migrations/00000000000000_pgvector_setup/migration.sql`.
