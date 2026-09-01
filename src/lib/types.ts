import { z } from "zod";

/** Central place for the string-backed "enum" values used across the app
 * (kept as validated strings rather than Prisma enums — see the comment at
 * the top of prisma/schema.prisma for why). */

export const OptionLetter = z.enum(["A", "B", "C", "D"]);
export type OptionLetter = z.infer<typeof OptionLetter>;

export const Difficulty = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const VerificationStatus = z.enum(["auto_imported", "verified", "rejected"]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const SourceStatus = z.enum(["not_configured", "ok", "error", "disabled"]);
export type SourceStatus = z.infer<typeof SourceStatus>;

export const ExtractionJobStatus = z.enum(["queued", "running", "completed", "failed"]);
export type ExtractionJobStatus = z.infer<typeof ExtractionJobStatus>;

export const TestMode = z.enum(["practice", "exam", "random", "subject"]);
export type TestMode = z.infer<typeof TestMode>;

export const McqImportSchema = z.object({
  question: z.string().min(8).max(600),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswerRaw: z.string().optional().nullable(),
  subjectHint: z.string().optional().nullable(),
  difficulty: Difficulty.optional(),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  sourceQuestionId: z.string().optional().nullable()
});
export type McqImportInput = z.infer<typeof McqImportSchema>;

export const SubmitAnswerSchema = z.object({
  mcqId: z.string(),
  selectedOption: OptionLetter.nullable()
});

export const SubmitTestSchema = z.object({
  attemptId: z.string(),
  answers: z.array(SubmitAnswerSchema)
});
