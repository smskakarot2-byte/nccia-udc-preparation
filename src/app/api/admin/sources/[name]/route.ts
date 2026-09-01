import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

/** PATCH /api/admin/sources/:name — enable/disable a source, edit notes
 * (spec section 14). `name` here is the Source.key. */
export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.isEnabled === "boolean") data.isEnabled = body.isEnabled;
  if (typeof body.notes === "string") data.notes = body.notes;

  const updated = await db.source.update({ where: { key: params.name }, data });
  return NextResponse.json(updated);
}
