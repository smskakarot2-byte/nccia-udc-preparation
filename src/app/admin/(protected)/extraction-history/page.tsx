"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Skeleton, Button } from "@/components/ui";

interface JobSummary {
  id: string; status: string; triggeredBy: string; questionsDiscovered: number; relevantCount: number;
  duplicateCount: number; irrelevantCount: number; savedCount: number; startedAt: string; finishedAt: string | null; durationMs: number | null;
}
interface SourceResult {
  sourceKey: string; status: string; found: number; relevant: number; duplicate: number; irrelevant: number; saved: number;
  errorMessage: string | null; source: { name: string };
}

export default function AdminExtractionHistoryPage() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<SourceResult[] | null>(null);

  useEffect(() => {
    fetch("/api/extraction-history").then((r) => r.json()).then((d) => setJobs(d.jobs));
  }, []);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setDetail(null);
    const res = await fetch(`/api/extraction-history?jobId=${id}`);
    const body = await res.json();
    setDetail(body.job.results);
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-6">Extraction History</h2>
      {!jobs && <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      {jobs && jobs.length === 0 && <Card className="p-6 text-sm text-ink-500">No extraction runs yet.</Card>}
      <div className="flex flex-col gap-3">
        {jobs?.map((j) => (
          <Card key={j.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge tone={j.status === "completed" ? "success" : j.status === "failed" ? "danger" : "neutral"}>{j.status}</Badge>
                  <span className="text-ink-500">{j.triggeredBy}</span>
                  <span className="text-ink-400">{new Date(j.startedAt).toLocaleString()}</span>
                </div>
                <div className="text-xs text-ink-500 mt-1">
                  {j.questionsDiscovered} discovered · {j.relevantCount} relevant · {j.duplicateCount} duplicate · {j.irrelevantCount} irrelevant · <strong>{j.savedCount} saved</strong>
                  {j.durationMs != null && ` · ${(j.durationMs / 1000).toFixed(1)}s`}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggle(j.id)}>{expanded === j.id ? "Hide" : "Details"}</Button>
            </div>
            {expanded === j.id && (
              <div className="mt-4 border-t border-ink-100 dark:border-ink-800 pt-4">
                {!detail && <Skeleton className="h-24" />}
                {detail && (
                  <table className="w-full text-xs">
                    <thead className="text-ink-400 uppercase text-left">
                      <tr><th className="py-1 pr-2">Source</th><th className="py-1 pr-2">Status</th><th className="py-1 pr-2">Found</th><th className="py-1 pr-2">Saved</th><th className="py-1">Note</th></tr>
                    </thead>
                    <tbody>
                      {detail.map((r) => (
                        <tr key={r.sourceKey} className="border-t border-ink-100 dark:border-ink-800">
                          <td className="py-1.5 pr-2 font-medium">{r.source.name}</td>
                          <td className="py-1.5 pr-2">{r.status}</td>
                          <td className="py-1.5 pr-2">{r.found}</td>
                          <td className="py-1.5 pr-2">{r.saved}</td>
                          <td className="py-1.5 text-ink-500">{r.errorMessage ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
