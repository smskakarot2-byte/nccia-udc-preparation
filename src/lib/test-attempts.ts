import { db } from "./db";

export interface BuiltAttemptQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  subject: string;
  difficulty: string;
}

/** Fisher–Yates shuffle — used so "random test" is actually random and not
 * just "first N rows", and so repeated random tests don't always surface
 * the same questions first. */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Builds a TestAttempt for a pool of eligible MCQs (active + has a
 * reliably known correct answer — spec section 18 keeps unverified-answer
 * MCQs out of the live quiz pool) and returns the question list with
 * correct answers stripped, so the client never receives them ahead of
 * submission. */
export async function buildAttempt(params: {
  jobProfileId: string;
  mode: "practice" | "exam" | "random" | "subject";
  subject?: string;
  count: number;
}): Promise<{ attemptId: string; questions: BuiltAttemptQuestion[] } | { error: string }> {
  const pool = await db.mcq.findMany({
    where: {
      jobProfileId: params.jobProfileId,
      isActive: true,
      correctOption: { not: null },
      ...(params.subject ? { subject: params.subject } : {})
    },
    select: {
      id: true, question: true, optionA: true, optionB: true, optionC: true, optionD: true,
      subject: true, difficulty: true
    }
  });

  if (pool.length === 0) {
    return {
      error: params.subject
        ? `No verified MCQs available yet for "${params.subject}".`
        : "No verified MCQs available yet — extract or import some first."
    };
  }

  const selected = shuffle(pool).slice(0, Math.min(params.count, pool.length));

  const attempt = await db.testAttempt.create({
    data: {
      jobProfileId: params.jobProfileId,
      mode: params.mode,
      subject: params.subject ?? null,
      totalQuestions: selected.length
    }
  });

  // Record the question order so exam-mode "unanswered" detection and
  // review screens are stable even if the client reorders its own state.
  await db.testAttemptAnswer.createMany({
    data: selected.map((q, idx) => ({ attemptId: attempt.id, mcqId: q.id, order: idx }))
  });

  return { attemptId: attempt.id, questions: selected };
}
