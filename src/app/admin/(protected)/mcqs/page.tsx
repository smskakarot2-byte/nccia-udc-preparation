"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, Badge, Button, Skeleton, EmptyState } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Mcq {
  id: string; question: string; subject: string; sourceName: string;
  correctOption: string | null; isVerified: boolean; isActive: boolean;
  verificationStatus: string; createdAt: string;
}

function AdminMcqsPageInner() {
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [items, setItems] = useState<Mcq[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const verifiedFilter = searchParams.get("verified");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20", activeOnly: "false" });
    if (verifiedFilter) params.set("verified", verifiedFilter);
    const res = await fetch(`/api/mcqs?${params.toString()}`);
    const body = await res.json();
    setItems(body.items);
    setTotalPages(body.totalPages);
  }, [page, verifiedFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, data: Record<string, unknown>, label: string) => {
    const res = await fetch(`/api/mcqs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    if (res.ok) { push("success", label); load(); }
    else push("error", "Action failed.");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this MCQ permanently?")) return;
    const res = await fetch(`/api/mcqs/${id}`, { method: "DELETE" });
    if (res.ok) { push("success", "MCQ deleted."); load(); }
    else push("error", "Delete failed.");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold">MCQ Management</h2>
        <div className="flex gap-2">
          <a href="/api/mcqs/export?format=csv"><Button variant="ghost" size="sm">Export CSV</Button></a>
          <a href="/api/mcqs/export?format=json"><Button variant="ghost" size="sm">Export JSON</Button></a>
        </div>
      </div>

      {!items && <div className="flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>}
      {items && items.length === 0 && <EmptyState title="No MCQs match this view" />}

      <div className="flex flex-col gap-3">
        {items?.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{m.question}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  <Badge>{m.subject}</Badge>
                  <span>{m.sourceName}</span>
                  {m.isVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">{m.verificationStatus}</Badge>}
                  {!m.isActive && <Badge tone="danger">Inactive</Badge>}
                  {!m.correctOption && <Badge tone="warning">No answer parsed</Badge>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Link href={`/admin/mcqs/${m.id}`}><Button size="sm" variant="ghost">Edit</Button></Link>
                {!m.isVerified && (
                  <Button size="sm" onClick={() => act(m.id, { verificationStatus: "verified", isActive: true }, "Marked verified.")}>Verify</Button>
                )}
                <Button size="sm" variant="danger" onClick={() => remove(m.id)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {items && items.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-xs text-ink-500">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

export default function AdminMcqsPage() {
  return (
    <Suspense fallback={null}>
      <AdminMcqsPageInner />
    </Suspense>
  );
}
