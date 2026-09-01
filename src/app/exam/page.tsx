"use client";
import { PageHeader } from "@/components/ui";
import { QuizRunner } from "@/components/quiz-runner";

export default function ExamPage() {
  return (
    <div>
      <PageHeader title="Exam Mode" subtitle="Answers are not revealed until you submit — full results and a subject-wise breakdown appear at the end." />
      <QuizRunner mode="exam" fetchUrl="/api/tests/random?count=20&mode=exam" />
    </div>
  );
}
