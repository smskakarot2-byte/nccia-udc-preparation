import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/extraction-history?page=1&pageSize=20
 * Powers /admin/extraction-history — list + drill into per-source detail
 * (spec section 35). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10) || 20));
  const jobId = sp.get("jobId");

  if (jobId) {
    const job = await db.extractionJob.findUnique({
      where: { id: jobId },
      include: { results: { include: { source: true }, orderBy: { createdAt: "asc" } } }
    });
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job });
  }

  const [total, jobs] = await Promise.all([
    db.extractionJob.count(),
    db.extractionJob.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { results: true } } }
    })
  ]);

  return NextResponse.json({ jobs, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
