import { NextResponse } from "next/server";
import { getAdminSession } from "./auth";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Returns the admin session, or writes a 401 response and returns null.
 * Usage: `const admin = await requireAdmin(); if (!admin) return admin;`
 * won't type-check cleanly, so call sites use the two-step pattern shown
 * in each admin route instead — see src/app/api/mcqs/[id]/route.ts. */
export async function getRequiredAdmin() {
  const session = await getAdminSession();
  return session;
}
