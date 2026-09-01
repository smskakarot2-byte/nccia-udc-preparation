import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const job = await db.extractionJob.findUnique({
    where: { id: params.jobId },
    include: { results: { include: { source: true }, orderBy: { createdAt: "asc" } } }
  });

  if (!job) return NextResponse.json({ error: "Extraction job not found." }, { status: 404 });

  const requestedKeys = job.sourcesRequested.split(",").filter(Boolean);
  const reportedKeys = new Set(job.results.map((r) => r.sourceKey));
  const pending = requestedKeys.filter((k) => !reportedKeys.has(k));

  return NextResponse.json({
    id: job.id,
    status: job.status,
    triggeredBy: job.triggeredBy,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    durationMs: job.durationMs,
    errorMessage: job.errorMessage,
    totals: {
      discovered: job.questionsDiscovered,
      relevant: job.relevantCount,
      duplicate: job.duplicateCount,
      irrelevant: job.irrelevantCount,
      invalid: job.invalidCount,
      saved: job.savedCount
    },
    sources: job.results.map((r) => ({
      key: r.sourceKey,
      name: r.source.name,
      status: r.status,
      found: r.found,
      relevant: r.relevant,
      duplicate: r.duplicate,
      irrelevant: r.irrelevant,
      saved: r.saved,
      errorMessage: r.errorMessage,
      durationMs: r.durationMs
    })),
    pendingSourceKeys: pending
  });
}
