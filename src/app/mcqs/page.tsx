"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, Card, Badge, Button, Skeleton, EmptyState, ErrorState } from "@/components/ui";

interface Mcq {
  id: string;
  question: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: string | null; subject: string; sourceName: string; sourceUrl: string | null;
  difficulty: string; isVerified: boolean; createdAt: string;
}
interface ListResponse { items: Mcq[]; page: number; totalPages: number; total: number; }

export default function AllMcqsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ subject: string; count: number }[]>([]);
  const [sources, setSources] = useState<{ name: string; mcqCount: number }[]>([]);

  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "20", sort });
    if (search) params.set("search", search);
    if (subject) params.set("subject", subject);
    if (source) params.set("source", source);
    if (difficulty) params.set("difficulty", difficulty);
    try {
      const res = await fetch(`/api/mcqs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load MCQs.");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [page, search, subject, source, difficulty, sort]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/mcqs/subjects").then((r) => r.json()).then((d) => setSubjects(d.subjects ?? []));
    fetch("/api/mcqs/sources").then((r) => r.json()).then((d) => setSources(d.sources ?? []));
  }, []);

  return (
    <div>
      <PageHeader title="All MCQs" subtitle="Every verified and auto-imported question currently in the bank." />

      <Card className="p-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search questions, options, subject…"
            className="focus-ring lg:col-span-2 rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm"
          />
          <select value={subject} onChange={(e) => { setPage(1); setSubject(e.target.value); }} className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm">
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.subject} ({s.count})</option>)}
          </select>
          <select value={source} onChange={(e) => { setPage(1); setSource(e.target.value); }} className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm">
            <option value="">All sources</option>
            {sources.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.mcqCount})</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}

      {!data && !error && <div className="flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>}

      {data && data.items.length === 0 && (
        <EmptyState title="No MCQs match these filters" description="Try clearing a filter, or extract/import some new questions." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {data.items.map((m) => (
              <Card key={m.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-medium text-ink-900 dark:text-paper-50">{m.question}</p>
                  {m.isVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
                </div>
                <div className="grid sm:grid-cols-2 gap-1.5 text-sm text-ink-600 dark:text-ink-200 mb-3">
                  {(["A", "B", "C", "D"] as const).map((letter) => {
                    const text = { A: m.optionA, B: m.optionB, C: m.optionC, D: m.optionD }[letter];
                    const isCorrect = m.correctOption === letter;
                    return (
                      <div key={letter} className={isCorrect ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                        {letter}. {text} {isCorrect && "✓"}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  <Badge>{m.subject}</Badge>
                  <span>Source: {m.sourceUrl ? <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="underline">{m.sourceName}</a> : m.sourceName}</span>
                  <span>·</span>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-xs text-ink-500">Page {data.page} of {data.totalPages} · {data.total} total</span>
            <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}
