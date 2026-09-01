"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, Button, Spinner, ErrorState } from "@/components/ui";

interface ReviewItem {
  mcqId: string; question: string; subject: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  selectedOption: string | null; correctOption: string | null; isCorrect: boolean | null;
}
interface AttemptResult {
  mode: string; subject: string | null; totalQuestions: number;
  correct: number; incorrect: number; unanswered: number; scorePercent: number;
  subjectBreakdown: { subject: string; correct: number; total: number; accuracy: number }[];
  review: ReviewItem[];
}

export default function ResultsPage({ params }: { params: { attemptId: string } }) {
  const [data, setData] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tests/attempt/${params.attemptId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load results.");
        setData(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong."));
  }, [params.attemptId]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-emerald-600" /></div>;

  return (
    <div>
      <PageHeader title="Test Results" subtitle={`${data.mode.charAt(0).toUpperCase() + data.mode.slice(1)} mode${data.subject ? ` · ${data.subject}` : ""}`} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="p-5 text-center"><div className="font-display text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{data.scorePercent}%</div><div className="text-xs text-ink-500 mt-1">Score</div></Card>
        <Card className="p-5 text-center"><div className="font-display text-2xl font-semibold">{data.totalQuestions}</div><div className="text-xs text-ink-500 mt-1">Total</div></Card>
        <Card className="p-5 text-center"><div className="font-display text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{data.correct}</div><div className="text-xs text-ink-500 mt-1">Correct</div></Card>
        <Card className="p-5 text-center"><div className="font-display text-2xl font-semibold text-crimson-600 dark:text-crimson-500">{data.incorrect}</div><div className="text-xs text-ink-500 mt-1">Incorrect</div></Card>
        <Card className="p-5 text-center"><div className="font-display text-2xl font-semibold text-ink-400">{data.unanswered}</div><div className="text-xs text-ink-500 mt-1">Unanswered</div></Card>
      </div>

      {data.subjectBreakdown.length > 1 && (
        <Card className="p-5 mb-8">
          <h3 className="font-display font-semibold mb-4">Subject-wise Performance</h3>
          <div className="flex flex-col gap-2">
            {data.subjectBreakdown.map((s) => (
              <div key={s.subject} className="flex items-center gap-3">
                <span className="text-sm w-40 truncate">{s.subject}</span>
                <div className="flex-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${s.accuracy}%` }} />
                </div>
                <span className="text-xs font-mono w-12 text-right">{s.accuracy}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <h3 className="font-display font-semibold mb-4">Question Review</h3>
      <div className="flex flex-col gap-4 mb-8">
        {data.review.map((r, i) => (
          <Card key={r.mcqId} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-medium">{i + 1}. {r.question}</p>
              {r.isCorrect === true && <Badge tone="success">Correct</Badge>}
              {r.isCorrect === false && <Badge tone="danger">Incorrect</Badge>}
              {r.isCorrect === null && <Badge tone="warning">Unanswered</Badge>}
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5 text-sm">
              {(["A", "B", "C", "D"] as const).map((letter) => {
                const text = { A: r.optionA, B: r.optionB, C: r.optionC, D: r.optionD }[letter];
                const isCorrectOpt = r.correctOption === letter;
                const isSelectedWrong = r.selectedOption === letter && letter !== r.correctOption;
                return (
                  <div
                    key={letter}
                    className={
                      isCorrectOpt ? "text-emerald-600 dark:text-emerald-400 font-medium" :
                      isSelectedWrong ? "text-crimson-600 dark:text-crimson-500 font-medium" :
                      "text-ink-600 dark:text-ink-300"
                    }
                  >
                    {letter}. {text} {isCorrectOpt && "✓"} {isSelectedWrong && "✗"}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/random-test"><Button>Try another test</Button></Link>
        <Link href="/"><Button variant="ghost">Back to dashboard</Button></Link>
      </div>
    </div>
  );
}
