"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Button, Skeleton } from "@/components/ui";
import { QuizRunner } from "@/components/quiz-runner";

interface SubjectCount { subject: string; count: number; }

export default function SubjectTestPage() {
  const [subjects, setSubjects] = useState<SubjectCount[] | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [count, setCount] = useState(20);

  useEffect(() => {
    fetch("/api/mcqs/subjects").then((r) => r.json()).then((d) => setSubjects(d.subjects ?? []));
  }, []);

  if (!subject) {
    return (
      <div>
        <PageHeader title="Subject Test" subtitle="Focus your practice on one syllabus subject at a time." />
        {!subjects && <div className="grid sm:grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
        {subjects && subjects.length === 0 && <Card className="p-6 text-sm text-ink-500">No subjects with questions yet — extract or import some MCQs first.</Card>}
        {subjects && subjects.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {subjects.map((s) => (
              <button
                key={s.subject}
                onClick={() => setSubject(s.subject)}
                className="focus-ring text-left rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 hover:border-emerald-400 transition-colors"
              >
                <div className="font-display font-semibold">{s.subject}</div>
                <div className="text-xs text-ink-500 mt-1">{s.count} question(s)</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${subject} — Subject Test`}
        subtitle="Answers are revealed after you submit."
        action={
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm"
          >
            {[10, 20, 30, 50].map((c) => <option key={c} value={c}>{c} questions</option>)}
          </select>
        }
      />
      <QuizRunner mode="subject" fetchUrl={`/api/tests/subject/${encodeURIComponent(subject)}?count=${count}`} />
    </div>
  );
}
