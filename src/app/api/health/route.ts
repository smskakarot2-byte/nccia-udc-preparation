import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/health — used by Docker/orchestrator healthchecks (spec 31). */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unreachable", message: err instanceof Error ? err.message : "unknown" },
      { status: 503 }
    );
  }
}
