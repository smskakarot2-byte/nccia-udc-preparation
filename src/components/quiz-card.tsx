"use client";

import clsx from "clsx";
import { Badge } from "./ui";

export interface QuizCardProps {
  index: number;
  total: number;
  subject: string;
  question: string;
  options: { letter: "A" | "B" | "C" | "D"; text: string }[];
  selected: "A" | "B" | "C" | "D" | null;
  /** Only supplied once an answer has been checked (practice mode) or the
   * attempt has been submitted (exam/random/subject review) — never
   * before, per spec section 8. */
  correctOption?: "A" | "B" | "C" | "D" | null;
  revealed: boolean;
  onSelect: (letter: "A" | "B" | "C" | "D") => void;
  disabled?: boolean;
}

export function QuizCard({ index, total, subject, question, options, selected, correctOption, revealed, onSelect, disabled }: QuizCardProps) {
  return (
    <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-card p-5 md:p-7">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">
          Question {index + 1} of {total}
        </span>
        <Badge>{subject}</Badge>
      </div>
      <h2 className="font-display text-lg md:text-xl font-semibold text-ink-900 dark:text-paper-50 mb-6">{question}</h2>
      <div className="flex flex-col gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.letter;
          const isCorrectOpt = revealed && correctOption === opt.letter;
          const isWrongSelected = revealed && isSelected && correctOption !== opt.letter;

          return (
            <button
              key={opt.letter}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.letter)}
              className={clsx(
                "focus-ring w-full text-left flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-colors",
                "min-h-[52px]", // touch-friendly target (spec 36)
                !revealed && !isSelected && "border-ink-200 dark:border-ink-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-600/10",
                !revealed && isSelected && "border-emerald-500 bg-emerald-50 dark:bg-emerald-600/15",
                isCorrectOpt && "border-emerald-500 bg-emerald-100 dark:bg-emerald-600/25",
                isWrongSelected && "border-crimson-500 bg-crimson-100 dark:bg-crimson-600/20",
                disabled && !isSelected && !isCorrectOpt && "opacity-60"
              )}
            >
              <span
                className={clsx(
                  "shrink-0 h-7 w-7 rounded-full border-2 grid place-items-center text-xs font-bold",
                  isCorrectOpt && "border-emerald-600 bg-emerald-600 text-white",
                  isWrongSelected && "border-crimson-600 bg-crimson-600 text-white",
                  !isCorrectOpt && !isWrongSelected && isSelected && "border-emerald-500 text-emerald-600",
                  !isCorrectOpt && !isWrongSelected && !isSelected && "border-ink-300 dark:border-ink-600 text-ink-500"
                )}
              >
                {opt.letter}
              </span>
              <span className="text-sm md:text-[15px] text-ink-800 dark:text-paper-100">{opt.text}</span>
              {isCorrectOpt && <span className="ml-auto text-emerald-600 dark:text-emerald-400 text-sm font-semibold">✓</span>}
              {isWrongSelected && <span className="ml-auto text-crimson-600 dark:text-crimson-500 text-sm font-semibold">✗</span>}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className={clsx(
            "mt-5 rounded-xl px-4 py-3 text-sm font-medium",
            selected === correctOption
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400"
              : "bg-crimson-100 text-crimson-700 dark:bg-crimson-600/20 dark:text-crimson-400"
          )}
        >
          {selected === correctOption ? "✓ Correct answer" : "✗ Incorrect"}
          {selected !== correctOption && correctOption && (
            <span className="block mt-1 font-normal">
              Correct answer: {correctOption}. {options.find((o) => o.letter === correctOption)?.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
