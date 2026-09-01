import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

/** GET /api/admin/syllabus — full subject list for the active job profile
 * (also usable unauthenticated for read-only display; only mutation is
 * gated). POST creates a new subject. Spec section 44/16: syllabus is
 * editable from the admin panel, no code changes required. */
export async function GET() {
  const jobProfile = await db.jobProfile.findFirst({ where: { isDefault: true } });
  if (!jobProfile) return NextResponse.json({ error: "No job profile configured." }, { status: 500 });

  const subjects = await db.syllabusSubject.findMany({
    where: { jobProfileId: jobProfile.id },
    orderBy: { sortOrder: "asc" }
  });
  return NextResponse.json({ subjects, jobProfile });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  const jobProfile = await db.jobProfile.findFirst({ where: { isDefault: true } });
  if (!jobProfile) return NextResponse.json({ error: "No job profile configured." }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.slug || !body.keywords) {
    return NextResponse.json({ error: "name, slug, and keywords are required." }, { status: 400 });
  }

  const created = await db.syllabusSubject.create({
    data: {
      jobProfileId: jobProfile.id,
      name: body.name,
      slug: body.slug,
      keywords: body.keywords,
      excludeKeywords: body.excludeKeywords ?? "",
      minKeywordHits: body.minKeywordHits ?? 1,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0
    }
  });
  return NextResponse.json(created, { status: 201 });
}
