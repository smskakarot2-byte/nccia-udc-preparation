"use client";
import { PageHeader } from "@/components/ui";
import { QuizRunner } from "@/components/quiz-runner";

export default function PracticePage() {
  return (
    <div>
      <PageHeader title="Practice Mode" subtitle="One question at a time, with the correct answer revealed immediately after you choose." />
      <QuizRunner mode="practice" fetchUrl="/api/tests/random?count=10&mode=practice" />
    </div>
  );
}
