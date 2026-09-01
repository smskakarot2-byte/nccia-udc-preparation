import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const allowed: Record<string, unknown> = {};
  for (const key of ["name", "slug", "keywords", "excludeKeywords", "minKeywordHits", "isActive", "sortOrder"] as const) {
    if (key in body) allowed[key] = body[key];
  }
  const updated = await db.syllabusSubject.update({ where: { id: params.id }, data: allowed });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  await db.syllabusSubject.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
