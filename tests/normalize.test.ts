import { describe, it, expect } from "vitest";
import { normalizeText, tokenize, sha256Hex, normalizeMcqForHash } from "@/lib/normalize";

describe("normalizeText", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeText("Who is the FOUNDER of Pakistan?")).toBe("who is the founder of pakistan");
  });

  it("collapses whitespace", () => {
    expect(normalizeText("Who   is\tthe founder  ")).toBe("who is the founder");
  });

  it("treats a trailing space+question mark as identical to none", () => {
    expect(normalizeText("Who is the founder of Pakistan?")).toBe(
      normalizeText("Who is the founder of Pakistan ?")
    );
  });

  it("treats case variants as identical", () => {
    expect(normalizeText("WHO IS THE FOUNDER OF PAKISTAN?")).toBe(
      normalizeText("who is the founder of pakistan?")
    );
  });
});

describe("tokenize", () => {
  it("removes common stopwords", () => {
    const tokens = tokenize(normalizeText("Who is the founder of Pakistan"));
    expect(tokens).not.toContain("is");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("of");
    expect(tokens).toContain("founder");
    expect(tokens).toContain("pakistan");
  });
});

describe("sha256Hex / normalizeMcqForHash", () => {
  const mcq = {
    question: "Who is the founder of Pakistan?",
    optionA: "Liaquat Ali Khan",
    optionB: "Muhammad Ali Jinnah",
    optionC: "Allama Iqbal",
    optionD: "Sir Syed Ahmad Khan"
  };

  it("produces the same hash for formatting/case variants", async () => {
    const h1 = await sha256Hex(normalizeMcqForHash(mcq));
    const h2 = await sha256Hex(
      normalizeMcqForHash({ ...mcq, question: "WHO IS THE FOUNDER OF PAKISTAN ?" })
    );
    expect(h1).toBe(h2);
  });

  it("is insensitive to option order", async () => {
    const h1 = await sha256Hex(normalizeMcqForHash(mcq));
    const h2 = await sha256Hex(
      normalizeMcqForHash({
        ...mcq,
        optionA: mcq.optionB,
        optionB: mcq.optionA
      })
    );
    expect(h1).toBe(h2);
  });

  it("produces a different hash for a genuinely different question", async () => {
    const h1 = await sha256Hex(normalizeMcqForHash(mcq));
    const h2 = await sha256Hex(
      normalizeMcqForHash({ ...mcq, question: "Who is the founder of Bangladesh?" })
    );
    expect(h1).not.toBe(h2);
  });
});
