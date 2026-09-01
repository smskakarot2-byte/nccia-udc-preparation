import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

/** GET /api/admin/job-profiles — list all job profiles (NCCIA UDC plus
 * any you add for FIA/PPSC/etc — spec section 44). POST creates a new one
 * with an empty syllabus, ready to configure from /admin/syllabus after
 * switching the active profile. */
export async function GET() {
  const profiles = await db.jobProfile.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { mcqs: true, subjects: true } } }
  });
  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.key || !body.name) {
    return NextResponse.json({ error: "key and name are required." }, { status: 400 });
  }

  const makeDefault = body.isDefault === true;
  if (makeDefault) {
    await db.jobProfile.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const created = await db.jobProfile.create({
    data: {
      key: body.key,
      name: body.name,
      description: body.description ?? null,
      isDefault: makeDefault,
      isActive: true
    }
  });
  return NextResponse.json(created, { status: 201 });
}
