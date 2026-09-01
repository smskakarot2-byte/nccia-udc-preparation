import { normalizeMcqForHash, normalizeText, tokenize, sha256Hex } from "./normalize";

export interface CandidateMcq {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface ExistingMcqForDupCheck {
  id: string;
  questionHash: string;
  normalizedQuestion: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  /** "exact" when the hash matches an existing row (covers verbatim,
   * formatting, and case duplicates — they all normalize to the same
   * string). "near" when no exact match exists but similarity to an
   * existing question clears the configured threshold. */
  matchType: "exact" | "near" | "none";
  matchedMcqId?: string;
  similarity?: number;
  questionHash: string;
  normalizedQuestion: string;
}

/** Jaccard similarity over token sets — cheap, dependency-free, and a
 * reasonable proxy for "same question, reworded" (spec section 5's near-
 * duplicate examples are exactly this kind of paraphrase). */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Simple TF-IDF cosine similarity across a small candidate pool. Used as a
 * second signal alongside Jaccard for near-duplicate detection — see
 * findNearDuplicate(). Deliberately lightweight (no embeddings/model
 * download) so it needs no network access or extra dependency. */
function cosineSimilarityTf(a: string[], b: string[], corpus: string[][]): number {
  const vocab = new Set([...a, ...b]);
  const df = new Map<string, number>();
  for (const term of vocab) {
    let count = 0;
    for (const doc of corpus) if (doc.includes(term)) count++;
    df.set(term, count || 1);
  }
  const n = Math.max(corpus.length, 1);
  const vec = (tokens: string[]) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const out = new Map<string, number>();
    for (const term of vocab) {
      const tfVal = tf.get(term) ?? 0;
      const idf = Math.log(1 + n / (df.get(term) ?? 1));
      out.set(term, tfVal * idf);
    }
    return out;
  };
  const va = vec(a);
  const vb = vec(b);
  let dot = 0, magA = 0, magB = 0;
  for (const term of vocab) {
    const x = va.get(term) ?? 0;
    const y = vb.get(term) ?? 0;
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export const DEFAULT_NEAR_DUPLICATE_THRESHOLD = 0.72;

/**
 * Full duplicate check for one candidate MCQ against the existing bank.
 * `existing` should be a reasonably small pre-filtered set (e.g. same
 * subject, or a capped "recent + same first-token" slice) — callers should
 * not pass the entire table for large datasets; see
 * src/lib/extraction-engine.ts for how this is invoked in practice.
 */
export async function checkDuplicate(
  candidate: CandidateMcq,
  existing: ExistingMcqForDupCheck[],
  opts?: { nearDuplicateThreshold?: number }
): Promise<DuplicateCheckResult> {
  const normalizedQuestion = normalizeText(candidate.question);
  const questionHash = await sha256Hex(normalizeMcqForHash(candidate));

  const exact = existing.find((e) => e.questionHash === questionHash);
  if (exact) {
    return {
      isDuplicate: true,
      matchType: "exact",
      matchedMcqId: exact.id,
      similarity: 1,
      questionHash,
      normalizedQuestion
    };
  }

  const threshold = opts?.nearDuplicateThreshold ?? DEFAULT_NEAR_DUPLICATE_THRESHOLD;
  const candidateTokens = tokenize(normalizedQuestion);
  const corpusTokens = existing.map((e) => tokenize(e.normalizedQuestion));

  let best: { id: string; score: number } | null = null;
  existing.forEach((e, i) => {
    const jac = jaccardSimilarity(candidateTokens, corpusTokens[i]);
    // Only bother with the pricier cosine pass for pairs Jaccard already
    // thinks are plausibly related — keeps this cheap at scale.
    if (jac < threshold - 0.25) return;
    const cos = cosineSimilarityTf(candidateTokens, corpusTokens[i], corpusTokens);
    const score = (jac + cos) / 2;
    if (!best || score > best.score) best = { id: e.id, score };
  });

  if (best && (best as { id: string; score: number }).score >= threshold) {
    const b = best as { id: string; score: number };
    return {
      isDuplicate: true,
      matchType: "near",
      matchedMcqId: b.id,
      similarity: b.score,
      questionHash,
      normalizedQuestion
    };
  }

  return {
    isDuplicate: false,
    matchType: "none",
    similarity: best ? (best as { id: string; score: number }).score : 0,
    questionHash,
    normalizedQuestion
  };
}
