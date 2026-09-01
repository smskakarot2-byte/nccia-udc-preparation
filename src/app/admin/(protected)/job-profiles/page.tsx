"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Profile {
  id: string; key: string; name: string; description: string | null; isDefault: boolean; isActive: boolean;
  _count: { mcqs: number; subjects: number };
}

export default function AdminJobProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [form, setForm] = useState({ key: "", name: "", description: "" });
  const { push } = useToast();

  const load = () => fetch("/api/admin/job-profiles").then((r) => r.json()).then((d) => setProfiles(d.profiles));
  useEffect(() => { load(); }, []);

  const create = async (makeDefault: boolean) => {
    if (!form.key || !form.name) { push("error", "Key and name are required."); return; }
    const res = await fetch("/api/admin/job-profiles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isDefault: makeDefault })
    });
    if (res.ok) { push("success", "Job profile created."); setForm({ key: "", name: "", description: "" }); load(); }
    else push("error", "Could not create job profile.");
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-2">Job Profiles</h2>
      <p className="text-sm text-ink-500 mb-6 max-w-2xl">
        The whole app — syllabus, sources, and MCQ bank — is scoped per job profile, so you can add another post
        (FIA, ASF, Police, PPSC, FPSC, NADRA, etc.) later without rebuilding anything. Only one profile is "default"
        (active) at a time; switching default changes what the public quiz pages and dashboard show.
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {profiles?.map((p) => (
          <Card key={p.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                {p.isDefault && <Badge tone="success">Active</Badge>}
              </div>
              <div className="text-xs text-ink-500 mt-1">{p.key} · {p._count.mcqs} MCQs · {p._count.subjects} subjects</div>
              {p.description && <p className="text-xs text-ink-500 mt-1 max-w-lg">{p.description}</p>}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-display font-semibold mb-3">Create a new job profile</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="Key (e.g. fia)" className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. FIA — Sub Inspector)" className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="focus-ring rounded-lg border border-ink-200 dark:border-ink-700 bg-transparent px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => create(false)}>Create</Button>
          <Button size="sm" variant="secondary" onClick={() => create(true)}>Create &amp; make active</Button>
        </div>
        <p className="text-xs text-ink-500 mt-3">
          After creating a profile, switch to it (make it active) and add subjects from{" "}
          <a href="/admin/syllabus" className="underline">Syllabus</a>.
        </p>
      </Card>
    </div>
  );
}
