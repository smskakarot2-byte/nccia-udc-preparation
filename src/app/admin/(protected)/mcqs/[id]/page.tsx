"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";

interface McqDetail {
  id: string; question: string; optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: string | null; subject: string; difficulty: string; sourceName: string; sourceUrl: string | null;
  verificationStatus: string; isVerified: boolean; isActive: boolean;
}

export default function AdminMcqEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { push } = useToast();
  const [mcq, setMcq] = useState<McqDetail | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/mcqs/${params.id}`).then((r) => r.json()).then(setMcq);
  }, [params.id]);

  if (!mcq) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-emerald-600" /></div>;

  const set = <K extends keyof McqDetail>(key: K, value: McqDetail[K]) => setMcq({ ...mcq, [key]: value });

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/mcqs/${mcq.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mcq)
    });
    setSaving(false);
    if (res.ok) { push("success", "MCQ updated."); router.push("/admin/mcqs"); }
    else push("error", "Save failed.");
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-semibold mb-6">Edit MCQ</h2>
      <Card className="p-6 flex flex-col gap-4">
        <label className="text-sm font-medium">Question
          <textarea value={mcq.question} onChange={(e) => set("question", e.target.value)} rows={3} className="focus-ring mt-1 w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
        </label>
        {(["A", "B", "C", "D"] as const).map((letter) => {
          const key = `option${letter}` as "optionA" | "optionB" | "optionC" | "optionD";
          return (
            <label key={letter} className="text-sm font-medium">Option {letter}
              <input value={mcq[key]} onChange={(e) => set(key, e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
            </label>
          );
        })}
        <label className="text-sm font-medium">Correct option
          <select value={mcq.correctOption ?? ""} onChange={(e) => set("correctOption", (e.target.value || null) as McqDetail["correctOption"])} className="focus-ring mt-1 w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm">
            <option value="">— none / unverified —</option>
            {["A", "B", "C", "D"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Subject
          <input value={mcq.subject} onChange={(e) => set("subject", e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Difficulty
          <select value={mcq.difficulty} onChange={(e) => set("difficulty", e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm">
            {["easy", "medium", "hard"].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Verification status
          <select value={mcq.verificationStatus} onChange={(e) => set("verificationStatus", e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm">
            {["auto_imported", "verified", "rejected"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium flex items-center gap-2">
          <input type="checkbox" checked={mcq.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          Active (shown in the live quiz pool)
        </label>
        <p className="text-xs text-ink-500">Source: {mcq.sourceName}{mcq.sourceUrl ? ` — ${mcq.sourceUrl}` : ""}</p>
        <div className="flex gap-2 mt-2">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          <Button variant="ghost" onClick={() => router.push("/admin/mcqs")}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}
