import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/mcqs/sources — every configured source with its live status,
 * used by the filter dropdown on /mcqs and the admin source table. */
export async function GET() {
  const sources = await db.source.findMany({ orderBy: { name: "asc" } });
  const counts = await db.mcq.groupBy({ by: ["sourceName"], _count: { _all: true } });
  const countMap = new Map(counts.map((c) => [c.sourceName, c._count._all]));

  return NextResponse.json({
    sources: sources.map((s) => ({ ...s, mcqCount: countMap.get(s.name) ?? 0 }))
  });
}
