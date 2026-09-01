import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAttempt } from "@/lib/test-attempts";

/** GET /api/tests/subject/:subject?count=20 */
export async function GET(req: NextRequest, { params }: { params: { subject: string } }) {
  const sp = req.nextUrl.searchParams;
  const count = Math.min(100, Math.max(1, parseInt(sp.get("count") ?? "10", 10) || 10));
  const subject = decodeURIComponent(params.subject);

  const jobProfile = await db.jobProfile.findFirst({ where: { isDefault: true } });
  if (!jobProfile) return NextResponse.json({ error: "No job profile configured." }, { status: 500 });

  const result = await buildAttempt({ jobProfileId: jobProfile.id, mode: "subject", subject, count });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result);
}
