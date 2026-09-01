import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Button, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [total, verified, needsVerification, sourcesEnabled, lastJob, subjects] = await Promise.all([
    db.mcq.count(),
    db.mcq.count({ where: { isVerified: true } }),
    db.mcq.count({ where: { isActive: false } }),
    db.source.count({ where: { isEnabled: true } }),
    db.extractionJob.findFirst({ orderBy: { createdAt: "desc" } }),
    db.syllabusSubject.count({ where: { isActive: true } })
  ]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5"><div className="text-xs text-ink-400 uppercase font-semibold">Total MCQs</div><div className="font-display text-2xl font-semibold mt-1">{total}</div></Card>
        <Card className="p-5"><div className="text-xs text-ink-400 uppercase font-semibold">Verified</div><div className="font-display text-2xl font-semibold mt-1">{verified}</div></Card>
        <Card className="p-5"><div className="text-xs text-ink-400 uppercase font-semibold">Needs Verification</div><div className="font-display text-2xl font-semibold mt-1">{needsVerification}</div></Card>
        <Card className="p-5"><div className="text-xs text-ink-400 uppercase font-semibold">Sources Enabled</div><div className="font-display text-2xl font-semibold mt-1">{sourcesEnabled} / 16</div></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">Verification queue</h3>
          <p className="text-sm text-ink-500 mb-4">
            {needsVerification} MCQ(s) were saved without a reliably parsed correct answer, and are hidden from the
            live quiz pool until reviewed.
          </p>
          <Link href="/admin/mcqs?verified=false"><Button size="sm">Review now</Button></Link>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">Last extraction run</h3>
          {lastJob ? (
            <div className="text-sm text-ink-600 dark:text-ink-200">
              <Badge tone={lastJob.status === "completed" ? "success" : lastJob.status === "failed" ? "danger" : "neutral"}>{lastJob.status}</Badge>
              <p className="mt-2">{lastJob.savedCount} saved · {lastJob.duplicateCount} duplicates · {lastJob.irrelevantCount} irrelevant</p>
              <Link href="/admin/extraction-history" className="underline underline-offset-2 text-xs mt-2 inline-block">View history</Link>
            </div>
          ) : (
            <p className="text-sm text-ink-500">No extraction has been run yet.</p>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">Syllabus</h3>
          <p className="text-sm text-ink-500 mb-4">{subjects} active subject(s) configured for the default job profile.</p>
          <Link href="/admin/syllabus"><Button size="sm" variant="ghost">Manage syllabus</Button></Link>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">Manual import</h3>
          <p className="text-sm text-ink-500 mb-4">Bring in MCQs you've collected yourself through the same validation pipeline.</p>
          <Link href="/admin/import"><Button size="sm" variant="ghost">Go to import</Button></Link>
        </Card>
      </div>
    </div>
  );
}
