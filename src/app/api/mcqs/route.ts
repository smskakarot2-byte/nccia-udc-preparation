import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/mcqs
 * Query params: page, pageSize, search, subject, source, difficulty,
 * sort ("newest" | "oldest"), verified ("true" | "false"), activeOnly
 * ("true" default for the public quiz UI's "All MCQs" page).
 * Always server-side paginated — never dumps the full table (spec 7).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10) || 20));
  const search = sp.get("search")?.trim();
  const subject = sp.get("subject")?.trim();
  const source = sp.get("source")?.trim();
  const difficulty = sp.get("difficulty")?.trim();
  const sort = sp.get("sort") === "oldest" ? "oldest" : "newest";
  const activeOnly = sp.get("activeOnly") !== "false";
  const verified = sp.get("verified");

  const where: Prisma.McqWhereInput = {};
  if (activeOnly) where.isActive = true;
  if (subject) where.subject = subject;
  if (source) where.sourceName = source;
  if (difficulty) where.difficulty = difficulty;
  if (verified === "true") where.isVerified = true;
  if (verified === "false") where.isVerified = false;
  if (search) {
    where.OR = [
      { question: { contains: search } },
      { optionA: { contains: search } },
      { optionB: { contains: search } },
      { optionC: { contains: search } },
      { optionD: { contains: search } },
      { subject: { contains: search } },
      { sourceName: { contains: search } }
    ];
  }

  const [total, items] = await Promise.all([
    db.mcq.count({ where }),
    db.mcq.findMany({
      where,
      orderBy: { createdAt: sort === "newest" ? "desc" : "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  });
}
