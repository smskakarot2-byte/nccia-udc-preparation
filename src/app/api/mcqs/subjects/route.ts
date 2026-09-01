import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/mcqs/subjects — distinct subjects with counts, for filter
 * dropdowns and the statistics page. */
export async function GET() {
  const grouped = await db.mcq.groupBy({
    by: ["subject"],
    where: { isActive: true },
    _count: { _all: true }
  });

  const subjects = grouped
    .map((g) => ({ subject: g.subject, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ subjects });
}
