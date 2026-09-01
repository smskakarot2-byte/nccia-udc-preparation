import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { validateMcqShape, classifyRelevance, SyllabusSubjectConfig } from "@/lib/relevance-filter";
import { checkDuplicate, ExistingMcqForDupCheck } from "@/lib/duplicate-detection";
import { normalizeText, normalizeMcqForHash, sha256Hex } from "@/lib/normalize";
import { parseCorrectAnswer } from "@/lib/correct-answer-parser";
import { McqImportSchema } from "@/lib/types";

/**
 * POST /api/mcqs/import
 *
 * The generic ingestion path requested in the spec for content you've
 * collected manually — since this project's live scrapers are documented
 * stubs (no verified selectors — see src/lib/scrapers/base.ts), this is
 * the practical way to get real, source-attributed MCQs into the bank
 * today: paste/collect them yourself (respecting each source's terms),
 * and submit them here. They go through the exact same pipeline as
 * automated extraction: structural validation, relevance filtering against
 * the active syllabus, duplicate detection, and correct-answer parsing.
 *
 * Body: { items: RawImportItem[] } — JSON array. For CSV, convert to this
 * shape client-side (a small parser is included on /admin/import) rather
 * than accepting arbitrary CSV server-side, so column-mapping mistakes are
 * caught in the UI before anything is written.
 *
 * Each item:
 * {
 *   question, optionA, optionB, optionC, optionD,
 *   correctAnswerRaw?,      // e.g. "Answer: B" or the answer text
 *   subjectHint?,           // ignored by relevance classification itself,
 *                           // kept only for reference — subject is always
 *                           // derived from the syllabus keyword match
 *   difficulty?,            // "easy" | "medium" | "hard"
 *   sourceName,             // required — who this MCQ is attributed to
 *   sourceUrl?,
 *   sourceQuestionId?
 * }
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin login required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Body must be { items: [...] }." }, { status: 400 });
  }
  if (body.items.length === 0) {
    return NextResponse.json({ error: "No items provided." }, { status: 400 });
  }
  if (body.items.length > 500) {
    return NextResponse.json({ error: "Import batches are capped at 500 items at a time." }, { status: 400 });
  }

  const jobProfile = await db.jobProfile.findFirst({ where: { isDefault: true } });
  if (!jobProfile) {
    return NextResponse.json({ error: "No default job profile configured." }, { status: 500 });
  }

  const syllabusRows = await db.syllabusSubject.findMany({
    where: { jobProfileId: jobProfile.id, isActive: true }
  });
  const syllabus: SyllabusSubjectConfig[] = syllabusRows.map((s) => ({
    name: s.name, slug: s.slug, keywords: s.keywords,
    excludeKeywords: s.excludeKeywords, minKeywordHits: s.minKeywordHits, isActive: s.isActive
  }));

  const existingRows = await db.mcq.findMany({
    where: { jobProfileId: jobProfile.id },
    select: { id: true, questionHash: true, normalizedQuestion: true },
    orderBy: { createdAt: "desc" },
    take: 4000
  });
  const existingPool: ExistingMcqForDupCheck[] = existingRows.map((r) => ({ ...r }));

  const summary = { received: body.items.length, invalid: 0, irrelevant: 0, duplicate: 0, saved: 0 };
  const errors: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < body.items.length; i++) {
    const parsed = McqImportSchema.safeParse(body.items[i]);
    if (!parsed.success) {
      summary.invalid++;
      errors.push({ index: i, reason: parsed.error.issues[0]?.message ?? "Invalid item." });
      continue;
    }
    const item = parsed.data;

    const shape = validateMcqShape(item);
    if (!shape.valid) {
      summary.invalid++;
      errors.push({ index: i, reason: shape.reason ?? "Invalid MCQ shape." });
      continue;
    }

    const relevance = classifyRelevance(item, syllabus);
    if (!relevance.relevant || !relevance.subject) {
      summary.irrelevant++;
      errors.push({ index: i, reason: "Not relevant to the active syllabus." });
      continue;
    }

    const dup = await checkDuplicate(item, existingPool);
    if (dup.isDuplicate) {
      summary.duplicate++;
      errors.push({ index: i, reason: `Duplicate (${dup.matchType}) of an existing MCQ.` });
      continue;
    }

    const parsedAnswer = parseCorrectAnswer(item.correctAnswerRaw, {
      A: item.optionA, B: item.optionB, C: item.optionC, D: item.optionD
    });

    const normalizedQuestion = normalizeText(item.question);
    const questionHash = await sha256Hex(normalizeMcqForHash(item));

    const created = await db.mcq.create({
      data: {
        jobProfileId: jobProfile.id,
        question: item.question.trim(),
        optionA: item.optionA.trim(),
        optionB: item.optionB.trim(),
        optionC: item.optionC.trim(),
        optionD: item.optionD.trim(),
        correctOption: parsedAnswer?.option ?? null,
        correctAnswer: parsedAnswer
          ? { A: item.optionA, B: item.optionB, C: item.optionC, D: item.optionD }[parsedAnswer.option]
          : null,
        subject: relevance.subject,
        difficulty: item.difficulty ?? "medium",
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl ?? null,
        sourceQuestionId: item.sourceQuestionId ?? null,
        normalizedQuestion,
        questionHash,
        isActive: parsedAnswer !== null,
        isVerified: false,
        verificationStatus: "auto_imported",
        relevanceConfidence: relevance.confidence,
        relevanceReason: relevance.reason
      }
    });

    existingPool.unshift({ id: created.id, questionHash, normalizedQuestion });
    summary.saved++;
  }

  return NextResponse.json({ summary, errors: errors.slice(0, 50) });
}
