import { normalizeText } from "./normalize";

/** Mirrors the shape of a SyllabusSubject row, kept as a plain interface so
 * this module has no Prisma dependency and is trivially unit-testable. */
export interface SyllabusSubjectConfig {
  name: string;
  slug: string;
  keywords: string; // comma-separated
  excludeKeywords: string; // comma-separated
  minKeywordHits: number;
  isActive: boolean;
}

export interface RelevanceCandidate {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface RelevanceResult {
  relevant: boolean;
  subject: string | null;
  confidence: number; // 0-1
  reason: string;
  matchedKeywords: string[];
}

function splitKeywords(csv: string): string[] {
  return csv
    .split(",")
    .map((k) => normalizeText(k.trim()))
    .filter(Boolean);
}

/**
 * Layer 1 of the filtering pipeline (spec section 19): basic structural
 * validation. This runs before relevance/subject scoring — a structurally
 * broken MCQ is rejected regardless of topic.
 */
export function validateMcqShape(candidate: RelevanceCandidate): { valid: boolean; reason?: string } {
  const q = candidate.question?.trim() ?? "";
  const opts = [candidate.optionA, candidate.optionB, candidate.optionC, candidate.optionD];

  if (q.length < 8) return { valid: false, reason: "Question text is missing or too short." };
  if (opts.some((o) => !o || o.trim().length === 0)) {
    return { valid: false, reason: "One or more options is missing (need four usable options)." };
  }
  const normalizedOpts = opts.map((o) => normalizeText(o));
  const uniqueOpts = new Set(normalizedOpts);
  if (uniqueOpts.size < 4) {
    return { valid: false, reason: "Options are not four distinct choices." };
  }
  if (q.length > 600) {
    return { valid: false, reason: "Question text is unusually long — likely a parsing error." };
  }
  return { valid: true };
}

/**
 * Layer 2/3: rule-based relevance + subject classification against the
 * active job profile's configurable syllabus. Scores every active subject
 * and returns the best match; a question must clear `minKeywordHits` for
 * at least one subject (and not be caught by that subject's exclude list)
 * to be considered relevant.
 */
export function classifyRelevance(
  candidate: RelevanceCandidate,
  syllabus: SyllabusSubjectConfig[]
): RelevanceResult {
  const haystack = normalizeText(
    [candidate.question, candidate.optionA, candidate.optionB, candidate.optionC, candidate.optionD].join(" ")
  );

  let best: RelevanceResult | null = null;

  for (const subject of syllabus) {
    if (!subject.isActive) continue;
    const includeTerms = splitKeywords(subject.keywords);
    const excludeTerms = splitKeywords(subject.excludeKeywords);

    const excludedHit = excludeTerms.find((term) => term && haystack.includes(term));
    if (excludedHit) continue;

    const matched = includeTerms.filter((term) => term && haystack.includes(term));
    if (matched.length === 0) continue;

    const confidence = Math.min(1, (matched.length / Math.max(subject.minKeywordHits, 1)) * 0.55);

    if (matched.length >= subject.minKeywordHits) {
      const candidateResult: RelevanceResult = {
        relevant: true,
        subject: subject.name,
        confidence: Math.max(0.4, confidence),
        reason: `Matched ${matched.length} keyword(s) for "${subject.name}": ${matched.slice(0, 5).join(", ")}.`,
        matchedKeywords: matched
      };
      if (!best || candidateResult.confidence > best.confidence) best = candidateResult;
    }
  }

  if (best) return best;

  return {
    relevant: false,
    subject: null,
    confidence: 0,
    reason: "No syllabus subject's keywords matched this question at the configured threshold.",
    matchedKeywords: []
  };
}
