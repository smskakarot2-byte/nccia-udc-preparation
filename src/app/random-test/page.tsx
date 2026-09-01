"use client";

import { useState } from "react";
import { PageHeader, Card, Button } from "@/components/ui";
import { QuizRunner } from "@/components/quiz-runner";

const COUNTS = [10, 20, 30, 50, 100];

export default function RandomTestPage() {
  const [count, setCount] = useState<number | null>(null);

  if (count === null) {
    return (
      <div>
        <PageHeader title="Random Test" subtitle="Pick how many questions, drawn at random from the whole bank." />
        <Card className="p-6 max-w-md">
          <div className="grid grid-cols-3 gap-3">
            {COUNTS.map((c) => (
              <Button key={c} variant="ghost" onClick={() => setCount(c)}>{c} questions</Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Random Test — ${count} questions`} subtitle="Answers are revealed after you submit." />
      <QuizRunner mode="random" fetchUrl={`/api/tests/random?count=${count}&mode=random`} />
    </div>
  );
}
