export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const jobProfile = await db.jobProfile.findFirst({ where: { isDefault: true } });
    if (!jobProfile) {
      console.error("No default job profile found in database. Please run database seed.");
      return NextResponse.json({ error: "No job profile configured. Please run database seed." }, { status: 500 });
    }

    const [
      totalMcqs,
      newLast7Days,
      verifiedCount,
      subjectCounts,
      recentMcqs,
      recentAttempts,
      lastExtraction,
      attemptAggregate
    ] = await Promise.all([
      db.mcq.count({ where: { jobProfileId: jobProfile.id, isActive: true } }),
      db.mcq.count({
        where: {
          jobProfileId: jobProfile.id,
          isActive: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      db.mcq.count({ where: { jobProfileId: jobProfile.id, isVerified: true } }),
      db.mcq.groupBy({ by: ["subject"], where: { jobProfileId: jobProfile.id, isActive: true }, _count: { _all: true } }),
      db.mcq.findMany({
        where: { jobProfileId: jobProfile.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, question: true, subject: true, sourceName: true, createdAt: true, isActive: true }
      }),
      db.testAttempt.findMany({
        where: { jobProfileId: jobProfile.id, finishedAt: { not: null } },
        orderBy: { finishedAt: "desc" },
        take: 8,
        select: { id: true, mode: true, subject: true, scorePercent: true, totalQuestions: true, finishedAt: true }
      }),
      db.extractionJob.findFirst({
        where: { jobProfileId: jobProfile.id },
        orderBy: { createdAt: "desc" }
      }),
      db.testAttempt.aggregate({
        where: { jobProfileId: jobProfile.id, finishedAt: { not: null } },
        _count: { _all: true },
        _max: { scorePercent: true },
        _sum: { correct: true, totalQuestions: true }
      })
    ]);

    const subjectAccuracy = await db.testAttemptAnswer.groupBy({
      by: ["isCorrect"],
      _count: { _all: true }
    });

    // Weak/strong subjects: accuracy per subject across all graded answers.
    const answers = await db.testAttemptAnswer.findMany({
      where: { isCorrect: { not: null } },
      select: { isCorrect: true, mcq: { select: { subject: true } } }
    });
    const bySubject = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const s = bySubject.get(a.mcq.subject) ?? { correct: 0, total: 0 };
      s.total++;
      if (a.isCorrect) s.correct++;
      bySubject.set(a.mcq.subject, s);
    }
    const subjectAccuracyList = Array.from(bySubject.entries())
      .map(([subject, s]) => ({ subject, accuracy: Math.round((s.correct / s.total) * 10000) / 100, attempts: s.total }))
      .sort((a, b) => a.accuracy - b.accuracy);

    return NextResponse.json({
      totalMcqs,
      newMcqsLast7Days: newLast7Days,
      verifiedMcqs: verifiedCount,
      questionsAttempted: attemptAggregate._sum.totalQuestions ?? 0,
      correctAnswers: attemptAggregate._sum.correct ?? 0,
      accuracy:
        attemptAggregate._sum.totalQuestions && attemptAggregate._sum.totalQuestions > 0
          ? Math.round(((attemptAggregate._sum.correct ?? 0) / attemptAggregate._sum.totalQuestions) * 10000) / 100
          : 0,
      testsCompleted: attemptAggregate._count._all,
      bestScore: attemptAggregate._max.scorePercent ?? 0,
      subjectCounts: subjectCounts.map((s) => ({ subject: s.subject, count: s._count._all })),
      recentMcqs,
      recentAttempts,
      lastExtraction: lastExtraction
        ? {
            id: lastExtraction.id,
            status: lastExtraction.status,
            savedCount: lastExtraction.savedCount,
            finishedAt: lastExtraction.finishedAt,
            startedAt: lastExtraction.startedAt
          }
        : null,
      weakSubjects: subjectAccuracyList.slice(0, 3),
      strongSubjects: [...subjectAccuracyList].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3)
    });
  } catch (error) {
    console.error("Dashboard API error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
