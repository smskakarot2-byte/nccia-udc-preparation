import { describe, it, expect } from "vitest";
import { parseCorrectAnswer } from "@/lib/correct-answer-parser";

const OPTIONS = {
  A: "Liaquat Ali Khan",
  B: "Muhammad Ali Jinnah",
  C: "Allama Iqbal",
  D: "Sir Syed Ahmad Khan"
};

describe("parseCorrectAnswer", () => {
  it("parses 'Answer: B'", () => {
    expect(parseCorrectAnswer("Answer: B", OPTIONS)?.option).toBe("B");
  });

  it("parses 'Ans: B'", () => {
    expect(parseCorrectAnswer("Ans: B", OPTIONS)?.option).toBe("B");
  });

  it("parses 'Correct: Option B'", () => {
    expect(parseCorrectAnswer("Correct: Option B", OPTIONS)?.option).toBe("B");
  });

  it("parses 'Correct Answer: Muhammad Ali Jinnah' by matching option text", () => {
    expect(parseCorrectAnswer("Correct Answer: Muhammad Ali Jinnah", OPTIONS)?.option).toBe("B");
  });

  it("parses a bare letter like '(B)'", () => {
    expect(parseCorrectAnswer("(B)", OPTIONS)?.option).toBe("B");
  });

  it("returns null for missing/empty input rather than guessing", () => {
    expect(parseCorrectAnswer(undefined, OPTIONS)).toBeNull();
    expect(parseCorrectAnswer("", OPTIONS)).toBeNull();
  });

  it("returns null when the text doesn't resolve to any option", () => {
    expect(parseCorrectAnswer("Correct Answer: Nobody knows", OPTIONS)).toBeNull();
  });
});
