"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Badge, Spinner } from "./ui";
import { useToast } from "./toast";

interface SourceProgress {
  key: string;
  name: string;
  status: string;
  found: number;
  relevant: number;
  duplicate: number;
  irrelevant: number;
  saved: number;
  errorMessage?: string | null;
}

interface JobStatus {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  totals: { discovered: number; relevant: number; duplicate: number; irrelevant: number; invalid: number; saved: number };
  sources: SourceProgress[];
  pendingSourceKeys: string[];
  errorMessage?: string | null;
}

function statusIcon(status: string) {
  if (status === "ok") return <span className="text-emerald-600 dark:text-emerald-400">✓</span>;
  if (status === "error") return <span className="text-crimson-600 dark:text-crimson-500">✗</span>;
  if (status === "not_configured") return <span className="text-gold-600 dark:text-gold-400">○</span>;
  return <Spinner className="h-3.5 w-3.5 text-ink-400" />;
}

export function ExtractPanel({ onCompleted }: { onCompleted?: () => void }) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [running, setRunning] = useState(false);
  const { push } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  useEffect(() => stopPolling, []);

  const startExtraction = async () => {
    setRunning(true);
    setJob(null);
    try {
      const res = await fetch("/api/mcqs/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await res.json();
      if (!res.ok) {
        push("error", body.error ?? "Could not start extraction.");
        setRunning(false);
        return;
      }
      const jobId = body.jobId as string;

      pollRef.current = setInterval(async () => {
        const statusRes = await fetch(`/api/mcqs/extraction-status/${jobId}`);
        if (!statusRes.ok) return;
        const status: JobStatus = await statusRes.json();
        setJob(status);
        if (status.status === "completed" || status.status === "failed") {
          stopPolling();
          setRunning(false);
          if (status.status === "completed") {
            if (status.totals.saved > 0) {
              push("success", `Extraction complete — ${status.totals.saved} new MCQ(s) saved.`);
            } else {
              push("info", "No new relevant MCQs found at this time.");
            }
          } else {
            push("error", status.errorMessage ?? "Extraction failed.");
          }
          onCompleted?.();
        }
      }, 900);
    } catch {
      push("error", "Network error while starting extraction.");
      setRunning(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Extraction Engine</h3>
        <Button onClick={startExtraction} disabled={running}>
          {running ? <Spinner className="h-4 w-4" /> : null}
          {running ? "Extracting…" : "Extract New MCQs"}
        </Button>
      </div>

      {!job && !running && (
        <p className="text-sm text-ink-500">
          Runs every enabled source through validation, relevance filtering, and duplicate detection, then saves
          only new, valid, on-syllabus MCQs. Manage which sources run from{" "}
          <a href="/admin/sources" className="underline underline-offset-2">Admin → Sources</a>.
        </p>
      )}

      {job && (
        <div className="text-sm">
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto thin-scroll pr-1">
            {job.sources.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-2 py-1 border-b border-ink-100 dark:border-ink-800 last:border-0">
                <span className="flex items-center gap-2 min-w-0">
                  {statusIcon(s.status)}
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="text-xs text-ink-500 font-mono shrink-0">
                  {s.status === "not_configured" ? "not configured" : `${s.found} found · ${s.saved} saved`}
                </span>
              </div>
            ))}
            {job.pendingSourceKeys.map((k) => (
              <div key={k} className="flex items-center justify-between gap-2 py-1 opacity-60">
                <span className="flex items-center gap-2"><Spinner className="h-3.5 w-3.5" /> {k}</span>
                <span className="text-xs text-ink-500">waiting…</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {[
              ["Discovered", job.totals.discovered],
              ["Relevant", job.totals.relevant],
              ["Duplicates", job.totals.duplicate],
              ["Irrelevant", job.totals.irrelevant],
              ["Invalid", job.totals.invalid],
              ["Saved", job.totals.saved]
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-ink-100 dark:bg-ink-800 py-2">
                <div className="font-mono font-semibold">{value}</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>

          {job.status === "completed" && (
            <div className="mt-4">
              {job.totals.saved > 0 ? (
                <Badge tone="success">Extraction complete — {job.totals.saved} new MCQ(s) saved</Badge>
              ) : (
                <Badge tone="warning">No new relevant MCQs found at this time.</Badge>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
