/**
 * Normalization utilities used across duplicate detection, relevance
 * filtering, and search. Kept dependency-free so they're trivial to unit
 * test (see tests/normalize.test.ts).
 */

/** Unicode-normalize, lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['"“”‘’]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // strip punctuation, keep letters/numbers
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize a question together with its four options into one string,
 * used as the input to hashing so that a question paired with a different
 * set of options is never conflated with a genuinely identical MCQ. */
export function normalizeMcqForHash(params: {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}): string {
  const q = normalizeText(params.question);
  const opts = [params.optionA, params.optionB, params.optionC, params.optionD]
    .map(normalizeText)
    .sort() // option order in the source HTML shouldn't affect identity
    .join("|");
  return `${q}::${opts}`;
}

/** Tokenize normalized text into a set of unique words (for Jaccard /
 * TF-IDF style comparisons). Stopwords are removed so near-duplicate
 * detection isn't dominated by "is/the/of/a" noise. */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "of", "in", "on", "at",
  "to", "for", "and", "or", "by", "with", "as", "that", "this", "which",
  "who", "whom", "what", "when", "where", "how", "does", "do", "did",
  "it", "its", "be", "been", "being"
]);

export function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  // Uses Web Crypto (available in the Node.js runtime Next.js API routes run
  // under, and in Edge runtimes) rather than the Node-only `crypto` module,
  // so this file works in either runtime without extra config.
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
