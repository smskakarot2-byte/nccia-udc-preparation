import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/tests/check-answer
 * Body: { mcqId, selectedOption }
 * Used by Practice Mode for the immediate correct/incorrect reveal (spec
 * section 8/9). A real server round-trip rather than the client holding
 * every correct answer up front — which is also what keeps Exam Mode
 * (same underlying question set) from being able to peek ahead.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mcqId = body.mcqId as string | undefined;
  const selectedOption = body.selectedOption as string | undefined;

  if (!mcqId || !selectedOption) {
    return NextResponse.json({ error: "mcqId and selectedOption are required." }, { status: 400 });
  }

  const mcq = await db.mcq.findUnique({ where: { id: mcqId } });
  if (!mcq) return NextResponse.json({ error: "MCQ not found." }, { status: 404 });

  return NextResponse.json({
    isCorrect: mcq.correctOption === selectedOption,
    correctOption: mcq.correctOption,
    correctAnswer: mcq.correctAnswer
  });
}
