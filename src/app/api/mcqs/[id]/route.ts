import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const mcq = await db.mcq.findUnique({ where: { id: params.id } });
  if (!mcq) return NextResponse.json({ error: "MCQ not found." }, { status: 404 });
  return NextResponse.json(mcq);
}

/** Admin-only edit: correct answer, subject, difficulty, verification
 * status, active/inactive. (spec section 16). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const allowed: Record<string, unknown> = {};

  for (const key of [
    "question", "optionA", "optionB", "optionC", "optionD",
    "correctOption", "correctAnswer", "subject", "difficulty",
    "isVerified", "isActive", "verificationStatus"
  ] as const) {
    if (key in body) allowed[key] = body[key];
  }

  if (allowed.correctOption && !["A", "B", "C", "D"].includes(allowed.correctOption as string)) {
    return NextResponse.json({ error: "correctOption must be one of A/B/C/D." }, { status: 400 });
  }
  if (allowed.verificationStatus && !["auto_imported", "verified", "rejected"].includes(allowed.verificationStatus as string)) {
    return NextResponse.json({ error: "Invalid verificationStatus." }, { status: 400 });
  }

  // Marking verified in the workflow also flips isVerified for consistency.
  if (allowed.verificationStatus === "verified") allowed.isVerified = true;
  if (allowed.verificationStatus === "rejected") allowed.isActive = false;

  const updated = await db.mcq.update({ where: { id: params.id }, data: allowed });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  await db.mcq.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
