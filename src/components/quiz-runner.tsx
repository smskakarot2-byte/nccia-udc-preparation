"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuizCard } from "./quiz-card";
import { Button, Card, Spinner, ErrorState, EmptyState } from "./ui";
import { useToast } from "./toast";

interface AttemptQuestion {
  id: string;
  question: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  subject: string;
}
type Letter = "A" | "B" | "C" | "D";

export function QuizRunner({ mode, fetchUrl }: { mode: "practice" | "exam" | "random" | "subject"; fetchUrl: string }) {
  const router = useRouter();
  const { push } = useToast();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AttemptQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Letter | null>>({});
  const [practiceFeedback, setPracticeFeedback] = useState<{ isCorrect: boolean; correctOption: Letter } | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
    fetch(fetchUrl)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not start this test.");
        setAttemptId(body.attemptId);
        setQuestions(body.questions);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl]);

  if (error) return <ErrorState message={error} />;
  if (!questions) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-emerald-600" /></div>;
  if (questions.length === 0) return <EmptyState title="No questions available" description="Try a different subject, or extract/import more MCQs first." />;

  const q = questions[index];
  const selected = answers[q.id] ?? null;
  const options = (["A", "B", "C", "D"] as const).map((letter) => ({
    letter,
    text: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD }[letter]
  }));

  const handleSelect = async (letter: Letter) => {
    if (mode === "practice" && practiceFeedback) return; // already revealed for this question
    setAnswers((a) => ({ ...a, [q.id]: letter }));

    if (mode === "practice") {
      setChecking(true);
      try {
        const res = await fetch("/api/tests/check-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mcqId: q.id, selectedOption: letter })
        });
        const body = await res.json();
        setPracticeFeedback({ isCorrect: body.isCorrect, correctOption: body.correctOption });
      } finally {
        setChecking(false);
      }
    }
  };

  const goNext = () => {
    setPracticeFeedback(null);
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  };
  const goPrev = () => {
    setPracticeFeedback(null);
    setIndex((i) => Math.max(i - 1, 0));
  };

  const submit = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tests/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers: questions.map((qq) => ({ mcqId: qq.id, selectedOption: answers[qq.id] ?? null }))
        })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not submit test.");
      router.push(`/results/${attemptId}`);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not submit test.");
      setSubmitting(false);
    }
  };

  const isLast = index === questions.length - 1;
  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div>
      <div className="mb-4 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <QuizCard
        index={index}
        total={questions.length}
        subject={q.subject}
        question={q.question}
        options={options}
        selected={selected}
        correctOption={mode === "practice" ? practiceFeedback?.correctOption : undefined}
        revealed={mode === "practice" && !!practiceFeedback}
        onSelect={handleSelect}
        disabled={mode === "practice" && (checking || !!practiceFeedback)}
      />

      <div className="flex items-center justify-between mt-5">
        <Button variant="ghost" onClick={goPrev} disabled={index === 0}>Previous</Button>
        <span className="text-xs text-ink-500">{answeredCount} of {questions.length} answered</span>
        {isLast ? (
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Spinner className="h-4 w-4" />}
            Submit test
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={mode === "practice" && !practiceFeedback}
          >
            Next
          </Button>
        )}
      </div>

      {mode === "practice" && !practiceFeedback && !isLast && (
        <p className="text-center text-xs text-ink-400 mt-3">Select an answer to continue.</p>
      )}
    </div>
  );
}
