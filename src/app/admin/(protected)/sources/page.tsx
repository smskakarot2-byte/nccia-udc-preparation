"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Skeleton } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Source {
  key: string; name: string; baseUrl: string; isEnabled: boolean; status: string;
  lastRunAt: string | null; questionsFoundLast: number; newQuestionsLast: number; errorsLast: string | null; mcqCount: number;
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const { push } = useToast();

  const load = () => fetch("/api/mcqs/sources").then((r) => r.json()).then((d) => setSources(d.sources));
  useEffect(() => { load(); }, []);

  const toggle = async (key: string, isEnabled: boolean) => {
    const res = await fetch(`/api/admin/sources/${key}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isEnabled })
    });
    if (res.ok) { push("success", `${key} ${isEnabled ? "enabled" : "disabled"}.`); load(); }
    else push("error", "Could not update source.");
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-2">Source Management</h2>
      <p className="text-sm text-ink-500 mb-6 max-w-2xl">
        All 15 requested sites are registered as adapters, but only <strong>Demo</strong> has real, working extraction
        logic (see status column). The rest are documented stubs — see the TODO block in each file under
        <code className="mx-1 px-1 rounded bg-ink-100 dark:bg-ink-800 text-xs">src/lib/scrapers/sources/</code>
        for how to activate one once you've verified you're allowed to scrape it.
      </p>

      {!sources && <div className="flex flex-col gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}

      <div className="flex flex-col gap-2">
        {sources?.map((s) => (
          <Card key={s.key} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                {s.status === "ok" && <Badge tone="success">Working</Badge>}
                {s.status === "not_configured" && <Badge tone="warning">Not configured</Badge>}
                {s.status === "error" && <Badge tone="danger">Error</Badge>}
              </div>
              <div className="text-xs text-ink-500 mt-1">
                {s.baseUrl} · {s.mcqCount} MCQ(s) saved
                {s.lastRunAt && ` · last run ${new Date(s.lastRunAt).toLocaleString()} (${s.questionsFoundLast} found, ${s.newQuestionsLast} new)`}
              </div>
              {s.errorsLast && <div className="text-xs text-crimson-600 dark:text-crimson-500 mt-1">{s.errorsLast}</div>}
            </div>
            <label className="flex items-center gap-2 text-sm shrink-0">
              <input type="checkbox" checked={s.isEnabled} onChange={(e) => toggle(s.key, e.target.checked)} />
              Enabled
            </label>
          </Card>
        ))}
      </div>
    </div>
  );
}
