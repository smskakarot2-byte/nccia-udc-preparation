"use client";

import { useEffect, useState } from "react";
import { Card, Button, Skeleton } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Subject {
  id: string; name: string; slug: string; keywords: string; excludeKeywords: string;
  minKeywordHits: number; isActive: boolean;
}

export default function AdminSyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [newSubject, setNewSubject] = useState({ name: "", slug: "", keywords: "" });
  const { push } = useToast();

  const load = () => fetch("/api/admin/syllabus").then((r) => r.json()).then((d) => setSubjects(d.subjects));
  useEffect(() => { load(); }, []);

  const save = async (s: Subject) => {
    const res = await fetch(`/api/admin/syllabus/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s)
    });
    if (res.ok) push("success", `${s.name} saved.`);
    else push("error", "Save failed.");
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this subject from the syllabus?")) return;
    const res = await fetch(`/api/admin/syllabus/${id}`, { method: "DELETE" });
    if (res.ok) { push("success", "Subject removed."); load(); }
  };

  const addSubject = async () => {
    if (!newSubject.name || !newSubject.slug || !newSubject.keywords) {
      push("error", "Name, slug, and at least one keyword are required.");
      return;
    }
    const res = await fetch("/api/admin/syllabus", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSubject)
    });
    if (res.ok) { push("success", "Subject added."); setNewSubject({ name: "", slug: "", keywords: "" }); load(); }
    else push("error", "Could not add subject.");
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-2">Syllabus</h2>
      <p className="text-sm text-ink-500 mb-6 max-w-2xl">
        This drives the relevance filter directly — a question is considered "relevant" only if it matches a
        subject's keywords at or above its minimum hit count. Edit freely; changes apply to the next extraction or
        import run.
      </p>

      {!subjects && <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>}

      <div className="flex flex-col gap-4">
        {subjects?.map((s, idx) => (
          <Card key={s.id} className="p-4">
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input value={s.name} onChange={(e) => { const c = [...subjects]; c[idx] = { ...s, name: e.target.value }; setSubjects(c); }} className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" placeholder="Subject name" />
              <input type="number" min={1} value={s.minKeywordHits} onChange={(e) => { const c = [...subjects]; c[idx] = { ...s, minKeywordHits: Number(e.target.value) }; setSubjects(c); }} className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" placeholder="Min keyword hits" />
            </div>
            <textarea
              value={s.keywords}
              onChange={(e) => { const c = [...subjects]; c[idx] = { ...s, keywords: e.target.value }; setSubjects(c); }}
              rows={2} placeholder="Include keywords, comma-separated"
              className="focus-ring w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm mb-2"
            />
            <textarea
              value={s.excludeKeywords}
              onChange={(e) => { const c = [...subjects]; c[idx] = { ...s, excludeKeywords: e.target.value }; setSubjects(c); }}
              rows={1} placeholder="Exclude keywords (optional), comma-separated"
              className="focus-ring w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm mb-3"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.isActive} onChange={(e) => { const c = [...subjects]; c[idx] = { ...s, isActive: e.target.checked }; setSubjects(c); }} />
                Active
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => save(subjects[idx])}>Save</Button>
                <Button size="sm" variant="danger" onClick={() => remove(s.id)}>Remove</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 mt-6">
        <h3 className="font-display font-semibold mb-3">Add a subject</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} placeholder="Name" className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
          <input value={newSubject.slug} onChange={(e) => setNewSubject({ ...newSubject, slug: e.target.value })} placeholder="Slug (e.g. urdu-grammar)" className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
          <input value={newSubject.keywords} onChange={(e) => setNewSubject({ ...newSubject, keywords: e.target.value })} placeholder="Keywords, comma-separated" className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
        </div>
        <Button size="sm" onClick={addSubject}>Add subject</Button>
      </Card>
    </div>
  );
}
