import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const attempt = await db.testAttempt.findUnique({
    where: { id: params.id },
    include: { answers: { include: { mcq: true }, orderBy: { order: "asc" } } }
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  if (!attempt.finishedAt) {
    return NextResponse.json({ error: "This attempt has not been submitted yet." }, { status: 409 });
  }

  const subjectStats = new Map<string, { correct: number; total: number }>();
  for (const row of attempt.answers) {
    const stat = subjectStats.get(row.mcq.subject) ?? { correct: 0, total: 0 };
    stat.total++;
    if (row.isCorrect) stat.correct++;
    subjectStats.set(row.mcq.subject, stat);
  }

  return NextResponse.json({
    attemptId: attempt.id,
    mode: attempt.mode,
    subject: attempt.subject,
    totalQuestions: attempt.totalQuestions,
    correct: attempt.correct,
    incorrect: attempt.incorrect,
    unanswered: attempt.unanswered,
    scorePercent: attempt.scorePercent,
    subjectBreakdown: Array.from(subjectStats.entries()).map(([subject, s]) => ({
      subject, correct: s.correct, total: s.total,
      accuracy: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 10000) / 100
    })),
    review: attempt.answers.map((row) => ({
      mcqId: row.mcqId,
      question: row.mcq.question,
      subject: row.mcq.subject,
      optionA: row.mcq.optionA, optionB: row.mcq.optionB, optionC: row.mcq.optionC, optionD: row.mcq.optionD,
      selectedOption: row.selectedOption,
      correctOption: row.mcq.correctOption,
      isCorrect: row.isCorrect
    }))
  });
}
