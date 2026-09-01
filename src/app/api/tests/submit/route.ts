export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SubmitTestSchema } from "@/lib/types";

/**
 * POST /api/tests/submit
 * Body: { attemptId, answers: [{ mcqId, selectedOption }] }
 * Grades the attempt server-side (client never had correct answers for
 * exam/random/subject modes), stores per-question results, and returns a
 * full summary including the subject-wise breakdown spec section 9 asks
 * for in Exam Mode's end screen.
 */
export async function POST(req: NextRequest) {
  const parsed = SubmitTestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission body." }, { status: 400 });
  }
  const { attemptId, answers } = parsed.data;

  const attempt = await db.testAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { include: { mcq: true }, orderBy: { order: "asc" } } }
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.finishedAt) {
    return NextResponse.json({ error: "This attempt was already submitted." }, { status: 409 });
  }

  const answerMap = new Map(answers.map((a) => [a.mcqId, a.selectedOption]));

  let correct = 0, incorrect = 0, unanswered = 0;
  const subjectStats = new Map<string, { correct: number; total: number }>();
  const review: Array<{
    mcqId: string; question: string; subject: string;
    optionA: string; optionB: string; optionC: string; optionD: string;
    selectedOption: string | null; correctOption: string | null; isCorrect: boolean | null;
  }> = [];

  for (const row of attempt.answers) {
    const selected = answerMap.get(row.mcqId) ?? null;
    const isCorrect = selected === null ? null : selected === row.mcq.correctOption;

    if (selected === null) unanswered++;
    else if (isCorrect) correct++;
    else incorrect++;

    const stat = subjectStats.get(row.mcq.subject) ?? { correct: 0, total: 0 };
    stat.total++;
    if (isCorrect) stat.correct++;
    subjectStats.set(row.mcq.subject, stat);

    await db.testAttemptAnswer.update({
      where: { id: row.id },
      data: { selectedOption: selected, isCorrect }
    });

    review.push({
      mcqId: row.mcqId,
      question: row.mcq.question,
      subject: row.mcq.subject,
      optionA: row.mcq.optionA, optionB: row.mcq.optionB, optionC: row.mcq.optionC, optionD: row.mcq.optionD,
      selectedOption: selected,
      correctOption: row.mcq.correctOption,
      isCorrect
    });
  }

  const total = attempt.answers.length;
  const scorePercent = total === 0 ? 0 : Math.round((correct / total) * 10000) / 100;

  const updated = await db.testAttempt.update({
    where: { id: attempt.id },
    data: { correct, incorrect, unanswered, scorePercent, finishedAt: new Date() }
  });

  return NextResponse.json({
    attemptId: updated.id,
    mode: updated.mode,
    subject: updated.subject,
    totalQuestions: total,
    correct,
    incorrect,
    unanswered,
    scorePercent,
    subjectBreakdown: Array.from(subjectStats.entries()).map(([subject, s]) => ({
      subject,
      correct: s.correct,
      total: s.total,
      accuracy: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 10000) / 100
    })),
    review
  });
}
