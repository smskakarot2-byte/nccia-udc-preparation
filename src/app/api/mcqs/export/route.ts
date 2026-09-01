import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

function toCsvValue(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** GET /api/mcqs/export?format=csv|json&subject=&source=
 * Admin-only (the bank may include unverified content not meant for
 * casual redistribution). Includes source attribution on every row, per
 * spec section 27/20. */
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") === "json" ? "json" : "csv";
  const subject = sp.get("subject") ?? undefined;
  const source = sp.get("source") ?? undefined;

  const items = await db.mcq.findMany({
    where: {
      ...(subject ? { subject } : {}),
      ...(source ? { sourceName: source } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(items, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nccia-udc-mcqs-${Date.now()}.json"`
      }
    });
  }

  const columns = [
    "id", "question", "optionA", "optionB", "optionC", "optionD",
    "correctOption", "correctAnswer", "subject", "difficulty",
    "sourceName", "sourceUrl", "isVerified", "verificationStatus", "createdAt"
  ] as const;

  const header = columns.join(",");
  const rows = items.map((item) =>
    columns.map((c) => toCsvValue((item as Record<string, unknown>)[c])).join(",")
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="nccia-udc-mcqs-${Date.now()}.csv"`
    }
  });
}
