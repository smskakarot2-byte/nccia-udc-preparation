import { describe, it, expect } from "vitest";
import { validateMcqShape, classifyRelevance, SyllabusSubjectConfig } from "@/lib/relevance-filter";

const SYLLABUS: SyllabusSubjectConfig[] = [
  {
    name: "Computer Science / IT",
    slug: "computer-it",
    keywords: "ms word,ms excel,keyboard shortcut,operating system,computer,internet",
    excludeKeywords: "kubernetes,distributed consensus",
    minKeywordHits: 1,
    isActive: true
  },
  {
    name: "Pakistan Studies",
    slug: "pakistan-studies",
    keywords: "pakistan,jinnah,constitution of pakistan",
    excludeKeywords: "",
    minKeywordHits: 1,
    isActive: true
  }
];

describe("validateMcqShape", () => {
  it("accepts a well-formed MCQ", () => {
    const result = validateMcqShape({
      question: "Which key combination copies selected text?",
      optionA: "Ctrl+V", optionB: "Ctrl+C", optionC: "Ctrl+X", optionD: "Ctrl+Z"
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a question missing an option", () => {
    const result = validateMcqShape({
      question: "Which key combination copies selected text?",
      optionA: "Ctrl+V", optionB: "", optionC: "Ctrl+X", optionD: "Ctrl+Z"
    });
    expect(result.valid).toBe(false);
  });

  it("rejects options that are not four distinct choices", () => {
    const result = validateMcqShape({
      question: "Which key combination copies selected text?",
      optionA: "Ctrl+V", optionB: "Ctrl+V", optionC: "Ctrl+X", optionD: "Ctrl+Z"
    });
    expect(result.valid).toBe(false);
  });

  it("rejects a too-short question", () => {
    const result = validateMcqShape({ question: "Hi?", optionA: "A", optionB: "B", optionC: "C", optionD: "D" });
    expect(result.valid).toBe(false);
  });
});

describe("classifyRelevance", () => {
  it("accepts a basic computer-fundamentals question as relevant", () => {
    const result = classifyRelevance(
      {
        question: "Which shortcut key is used to open a new document in MS Word?",
        optionA: "Ctrl+N", optionB: "Ctrl+O", optionC: "Ctrl+S", optionD: "Ctrl+P"
      },
      SYLLABUS
    );
    expect(result.relevant).toBe(true);
    expect(result.subject).toBe("Computer Science / IT");
  });

  it("rejects an unrelated advanced-engineering question", () => {
    const result = classifyRelevance(
      {
        question: "What is the maximum shear stress theory used for in mechanical design?",
        optionA: "A", optionB: "B", optionC: "C", optionD: "D"
      },
      SYLLABUS
    );
    expect(result.relevant).toBe(false);
  });

  it("excludes a question matched by an exclude keyword even if an include keyword also matches", () => {
    const result = classifyRelevance(
      {
        question: "Kubernetes uses a distributed consensus algorithm on a computer cluster to manage state.",
        optionA: "A", optionB: "B", optionC: "C", optionD: "D"
      },
      SYLLABUS
    );
    expect(result.relevant).toBe(false);
  });

  it("classifies a Pakistan Studies question correctly", () => {
    const result = classifyRelevance(
      {
        question: "The Constitution of Pakistan was adopted in which year?",
        optionA: "1956", optionB: "1962", optionC: "1973", optionD: "1985"
      },
      SYLLABUS
    );
    expect(result.relevant).toBe(true);
    expect(result.subject).toBe("Pakistan Studies");
  });
});
