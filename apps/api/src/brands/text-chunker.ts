/**
 * Splits text into overlapping chunks for embedding (spec: ~800 tokens, 100
 * overlap). Without a tokenizer dependency we approximate at ~4 chars/token, so
 * defaults are 3200-char windows with 400-char overlap. Swap in a real tokenizer
 * (e.g. tiktoken/js-tiktoken) later without changing callers.
 */
export interface ChunkOptions {
  chunkChars?: number;
  overlapChars?: number;
}

export function chunkText(
  text: string,
  opts: ChunkOptions = {},
): string[] {
  const chunkChars = opts.chunkChars ?? 3200;
  const overlapChars = opts.overlapChars ?? 400;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length === 0) return [];
  if (clean.length <= chunkChars) return [clean];

  const step = Math.max(1, chunkChars - overlapChars);
  const chunks: string[] = [];
  for (let start = 0; start < clean.length; start += step) {
    const slice = clean.slice(start, start + chunkChars).trim();
    if (slice.length > 0) chunks.push(slice);
    if (start + chunkChars >= clean.length) break;
  }
  return chunks;
}
