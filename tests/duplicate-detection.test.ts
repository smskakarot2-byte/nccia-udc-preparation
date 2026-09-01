import { describe, it, expect } from "vitest";
import { checkDuplicate, ExistingMcqForDupCheck } from "@/lib/duplicate-detection";
import { normalizeText, normalizeMcqForHash, sha256Hex } from "@/lib/normalize";

const BASE = {
  question: "Who is the founder of Pakistan?",
  optionA: "Liaquat Ali Khan",
  optionB: "Muhammad Ali Jinnah",
  optionC: "Allama Iqbal",
  optionD: "Sir Syed Ahmad Khan"
};

async function toExisting(mcq: typeof BASE, id = "existing-1"): Promise<ExistingMcqForDupCheck> {
  return {
    id,
    questionHash: await sha256Hex(normalizeMcqForHash(mcq)),
    normalizedQuestion: normalizeText(mcq.question)
  };
}

describe("checkDuplicate — exact duplicates", () => {
  it("flags a verbatim repeat", async () => {
    const existing = [await toExisting(BASE)];
    const result = await checkDuplicate(BASE, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe("exact");
  });

  it("flags a formatting-only variant (extra space before ?)", async () => {
    const existing = [await toExisting(BASE)];
    const variant = { ...BASE, question: "Who is the founder of Pakistan ?" };
    const result = await checkDuplicate(variant, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe("exact");
  });

  it("flags a case-only variant", async () => {
    const existing = [await toExisting(BASE)];
    const variant = { ...BASE, question: "WHO IS THE FOUNDER OF PAKISTAN?" };
    const result = await checkDuplicate(variant, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe("exact");
  });
});

describe("checkDuplicate — near duplicates", () => {
  it("flags a reworded paraphrase of the same question (spec example: 'Who founded Pakistan?' vs 'Pakistan was founded by whom?')", async () => {
    const original = { ...BASE, question: "Who founded Pakistan?" };
    const existing = [await toExisting(original)];
    const variant = { ...BASE, question: "Pakistan was founded by whom?" };
    const result = await checkDuplicate(variant, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe("near");
  });
});

describe("checkDuplicate — genuinely different questions", () => {
  it("does not flag an unrelated question that happens to share some words", async () => {
    const existing = [await toExisting(BASE)];
    const different = {
      question: "Who is the current Chief Justice of Pakistan?",
      optionA: "A", optionB: "B", optionC: "C", optionD: "D"
    };
    const result = await checkDuplicate(different, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it("does not flag a different question about a different country", async () => {
    const existing = [await toExisting(BASE)];
    const different = { ...BASE, question: "Who is the founder of Bangladesh?" };
    const result = await checkDuplicate(different, existing);
    expect(result.isDuplicate).toBe(false);
  });
});
