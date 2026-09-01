"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, PageHeader, Button, Skeleton, ErrorState, Badge } from "@/components/ui";
import { ExtractPanel } from "@/components/extract-panel";

interface DashboardData {
  totalMcqs: number;
  newMcqsLast7Days: number;
  verifiedMcqs: number;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  testsCompleted: number;
  bestScore: number;
  subjectCounts: { subject: string; count: number }[];
  recentMcqs: { id: string; question: string; subject: string; sourceName: string; createdAt: string; isActive: boolean }[];
  recentAttempts: { id: string; mode: string; subject: string | null; scorePercent: number; totalQuestions: number; finishedAt: string }[];
  lastExtraction: { id: string; status: string; savedCount: number; finishedAt: string | null; startedAt: string } | null;
  weakSubjects: { subject: string; accuracy: number; attempts: number }[];
  strongSubjects: { subject: string; accuracy: number; attempts: number }[];
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-paper-50">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard.");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="NCCIA UDC Preparation"
        subtitle="Track your progress and keep the question bank growing."
        action={
          <div className="flex gap-2">
            <Link href="/random-test"><Button variant="secondary">Quick Start Test</Button></Link>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}

      {!data && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total MCQs" value={data.totalMcqs} hint={`${data.newMcqsLast7Days} new in 7 days`} />
            <StatCard label="Verified MCQs" value={data.verifiedMcqs} />
            <StatCard label="Questions Attempted" value={data.questionsAttempted} />
            <StatCard label="Accuracy" value={`${data.accuracy}%`} />
            <StatCard label="Correct Answers" value={data.correctAnswers} />
            <StatCard label="Tests Completed" value={data.testsCompleted} />
            <StatCard label="Best Score" value={`${data.bestScore}%`} />
            <StatCard
              label="Last Extraction"
              value={data.lastExtraction ? data.lastExtraction.status : "Never run"}
              hint={data.lastExtraction ? `${data.lastExtraction.savedCount} saved` : undefined}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ExtractPanel onCompleted={load} />
            </div>
            <Card className="p-5">
              <h3 className="font-display font-semibold mb-4">MCQs by Subject</h3>
              <div className="flex flex-col gap-2.5">
                {data.subjectCounts.length === 0 && <p className="text-sm text-ink-500">No MCQs yet.</p>}
                {data.subjectCounts.map((s) => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{s.subject}</span>
                    <span className="text-xs font-mono text-ink-500">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-display font-semibold mb-4">Recently Extracted MCQs</h3>
              {data.recentMcqs.length === 0 ? (
                <p className="text-sm text-ink-500">Nothing yet — click "Extract New MCQs" above.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.recentMcqs.map((m) => (
                    <li key={m.id} className="text-sm border-b border-ink-100 dark:border-ink-800 pb-3 last:border-0 last:pb-0">
                      <p className="text-ink-800 dark:text-paper-100 line-clamp-2">{m.question}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                        <Badge>{m.subject}</Badge>
                        <span>{m.sourceName}</span>
                        {!m.isActive && <Badge tone="warning">Needs verification</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-display font-semibold mb-4">Recent Test Scores</h3>
              {data.recentAttempts.length === 0 ? (
                <p className="text-sm text-ink-500">No completed tests yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.recentAttempts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm border-b border-ink-100 dark:border-ink-800 pb-3 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium capitalize">{a.mode}</span>
                        {a.subject && <span className="text-ink-500"> · {a.subject}</span>}
                        <div className="text-xs text-ink-500">{a.totalQuestions} questions</div>
                      </div>
                      <Link href={`/results/${a.id}`} className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 focus-ring rounded">
                        {a.scorePercent}%
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {(data.weakSubjects.length > 0 || data.strongSubjects.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Card className="p-5">
                <h3 className="font-display font-semibold mb-4">Weak Subjects</h3>
                <ul className="flex flex-col gap-2">
                  {data.weakSubjects.map((s) => (
                    <li key={s.subject} className="flex justify-between text-sm">
                      <span>{s.subject}</span>
                      <span className="font-mono text-crimson-600 dark:text-crimson-500">{s.accuracy}%</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <h3 className="font-display font-semibold mb-4">Strong Subjects</h3>
                <ul className="flex flex-col gap-2">
                  {data.strongSubjects.map((s) => (
                    <li key={s.subject} className="flex justify-between text-sm">
                      <span>{s.subject}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{s.accuracy}%</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
