/**
 * Normalizes the many ways source sites express a correct answer
 * ("Answer: B", "Correct Answer: Muhammad Ali Jinnah", "Ans: B",
 * "Correct: Option B", "(B)", "b.") into a single { option, text } shape.
 * Spec section 18. Returns null when nothing reliable was found — callers
 * must NOT guess (extraction-engine sends such MCQs to the verification
 * queue instead of the live quiz pool).
 */

export interface ParsedCorrectAnswer {
  option: "A" | "B" | "C" | "D";
  confidence: "high" | "medium";
}

const LETTER_PATTERNS: RegExp[] = [
  /\bcorrect\s*answer\s*[:\-]?\s*(?:option\s*)?\(?([abcd])\)?\b/i,
  /\bans(?:wer)?\s*[:\-]?\s*(?:option\s*)?\(?([abcd])\)?\b/i,
  /\bcorrect\s*[:\-]\s*(?:option\s*)?\(?([abcd])\)?\b/i,
  /^\(?([abcd])\)?$/i
];

/**
 * Attempt to resolve a raw "answer" string to an option letter.
 * `rawAnswerText` is whatever the source labeled as the answer (could be a
 * letter, "Option B", or the full answer text). `options` is used to match
 * on text when no letter is present.
 */
export function parseCorrectAnswer(
  rawAnswerText: string | null | undefined,
  options: { A: string; B: string; C: string; D: string }
): ParsedCorrectAnswer | null {
  if (!rawAnswerText) return null;
  const raw = rawAnswerText.trim();
  if (!raw) return null;

  for (const pattern of LETTER_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      const letter = match[1].toUpperCase();
      if (letter === "A" || letter === "B" || letter === "C" || letter === "D") {
        return { option: letter, confidence: "high" };
      }
    }
  }

  // No letter found — try matching the answer text against the option
  // text itself (handles "Correct Answer: Muhammad Ali Jinnah").
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

  const target = normalize(
    raw.replace(/^(correct\s*answer|answer|ans|correct)\s*[:\-]?\s*/i, "")
  );
  if (!target) return null;

  const entries: Array<["A" | "B" | "C" | "D", string]> = [
    ["A", options.A],
    ["B", options.B],
    ["C", options.C],
    ["D", options.D]
  ];

  for (const [letter, text] of entries) {
    if (normalize(text) === target) {
      return { option: letter, confidence: "medium" };
    }
  }

  // Fuzzy fallback: target is a substantial substring of exactly one option.
  const partial = entries.filter(
    ([, text]) => target.length > 3 && normalize(text).includes(target)
  );
  if (partial.length === 1) {
    return { option: partial[0][0], confidence: "medium" };
  }

  return null;
}

export function resolveAnswerText(
  option: "A" | "B" | "C" | "D",
  options: { A: string; B: string; C: string; D: string }
): string {
  return options[option];
}
