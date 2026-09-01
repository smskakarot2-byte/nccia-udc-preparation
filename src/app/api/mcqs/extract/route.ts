export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createExtractionJob, processExtractionJob } from "@/lib/extraction-engine";

/**
 * POST /api/mcqs/extract
 * Body (optional): { sourceKeys?: string[] }
 * This is the real "Extract New MCQs" action — it is not a fake button.
 * It creates a job row, starts processing it, and returns the jobId right
 * away so the UI can show live progress via
 * GET /api/mcqs/extraction-status/:jobId instead of blocking the request.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as { sourceKeys?: string[] }));

  const jobProfile = await db.jobProfile.findFirst({ where: { isDefault: true } });
  if (!jobProfile) {
    return NextResponse.json(
      { error: "No default job profile configured. Run `npm run db:seed` first." },
      { status: 500 }
    );
  }

  const enabledSources = await db.source.findMany({ where: { isEnabled: true } });
  if (enabledSources.length === 0) {
    return NextResponse.json(
      {
        error:
          "No sources are enabled. Enable at least one from /admin/sources (the Demo source is enabled by default after seeding)."
      },
      { status: 400 }
    );
  }

  const jobId = await createExtractionJob({
    jobProfileId: jobProfile.id,
    sourceKeys: body.sourceKeys,
    triggeredBy: "manual"
  });

  // Deliberately not awaited — see the caveat documented on
  // createExtractionJob() in src/lib/extraction-engine.ts.
  processExtractionJob(jobId).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`Extraction job ${jobId} crashed outside its own try/catch:`, err);
  });

  return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
}
