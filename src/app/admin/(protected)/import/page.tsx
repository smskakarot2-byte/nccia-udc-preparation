"use client";

import { useRef, useState } from "react";
import { Card, Button } from "@/components/ui";
import { useToast } from "@/components/toast";

const JSON_PLACEHOLDER = `[
  {
    "question": "The capital of Pakistan is:",
    "optionA": "Karachi", "optionB": "Lahore", "optionC": "Islamabad", "optionD": "Peshawar",
    "correctAnswerRaw": "Answer: C",
    "sourceName": "Manual entry",
    "sourceUrl": "https://example.com/source-page"
  }
]`;

/** Minimal CSV parser (no external dependency) — handles quoted fields
 * and commas within quotes. Expects a header row matching the import
 * schema field names. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (field.length || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((v) => v.trim().length)).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h] = r[i] ?? ""; });
    return obj;
  });
}

export default function AdminImportPage() {
  const [json, setJson] = useState(JSON_PLACEHOLDER);
  const [result, setResult] = useState<{ summary: Record<string, number>; errors: { index: number; reason: string }[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  const submitItems = async (items: unknown[]) => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/mcqs/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items })
      });
      const body = await res.json();
      if (!res.ok) { push("error", body.error ?? "Import failed."); return; }
      setResult(body);
      push("success", `Imported ${body.summary.saved} of ${body.summary.received} item(s).`);
    } catch {
      push("error", "Network error during import.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitJson = () => {
    let items: unknown[];
    try {
      items = JSON.parse(json);
      if (!Array.isArray(items)) throw new Error("Top-level JSON must be an array.");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Invalid JSON.");
      return;
    }
    submitItems(items);
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    submitItems(rows);
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-2">Manual Import</h2>
      <p className="text-sm text-ink-500 mb-6 max-w-2xl">
        The generic ingestion path for MCQs you've collected yourself (respecting each source's terms). Every item
        goes through the same pipeline as automated extraction: structural validation, relevance filtering against
        the active syllabus, duplicate detection, and correct-answer parsing — nothing is saved unchecked.
      </p>

      <Card className="p-5 mb-6">
        <h3 className="font-display font-semibold mb-3">Paste JSON</h3>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={12}
          className="focus-ring w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-xs font-mono"
        />
        <Button className="mt-3" onClick={submitJson} disabled={submitting}>{submitting ? "Importing…" : "Import JSON"}</Button>
      </Card>

      <Card className="p-5 mb-6">
        <h3 className="font-display font-semibold mb-3">Upload CSV</h3>
        <p className="text-xs text-ink-500 mb-3">
          Header row must include: question, optionA, optionB, optionC, optionD, correctAnswerRaw, sourceName, sourceUrl (optional columns may be blank).
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
          className="text-sm"
        />
      </Card>

      {result && (
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">Import result</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
            {Object.entries(result.summary).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-ink-100 dark:bg-ink-800 py-2">
                <div className="font-mono font-semibold">{v}</div>
                <div className="text-[10px] text-ink-500 uppercase">{k}</div>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <ul className="text-xs text-ink-500 flex flex-col gap-1 max-h-40 overflow-y-auto thin-scroll">
              {result.errors.map((e, i) => <li key={i}>Item {e.index + 1}: {e.reason}</li>)}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
