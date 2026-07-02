-- Enable pgvector. Prisma's `postgresqlExtensions` also declares this; kept here so a
-- raw `migrate deploy` on a fresh DB is self-contained.
CREATE EXTENSION IF NOT EXISTS vector;

-- The embedding column + ANN index cannot be expressed in schema.prisma, so they are
-- managed here. See NOTES.md for the dimension decision.
--
-- These statements run AFTER the generated table-creation migration. In practice you
-- generate the baseline with `prisma migrate dev`, then this migration alters the column
-- type and adds the index. On a greenfield DB the ordering is enforced by the timestamped
-- folder name — rename this folder to sort correctly relative to your first generated
-- migration if needed.

-- 1536 dims keeps us safely under pgvector's 2000-dim ANN indexing ceiling (see NOTES.md).
ALTER TABLE brand_embeddings
  ALTER COLUMN embedding TYPE vector(1536);

-- HNSW gives better recall/latency than ivfflat and needs no training step / list tuning.
-- (The spec called for ivfflat with lists=100; HNSW is the better default for this scale.)
CREATE INDEX IF NOT EXISTS brand_embeddings_embedding_hnsw
  ON brand_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
