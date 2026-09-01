import { db } from "./db";
import { SCRAPER_REGISTRY } from "./scrapers/registry";
import type { RawScrapedMcq, ScraperRunContext } from "./scrapers/base";
import { validateMcqShape, classifyRelevance, SyllabusSubjectConfig } from "./relevance-filter";
import { checkDuplicate, ExistingMcqForDupCheck } from "./duplicate-detection";
import { normalizeText, normalizeMcqForHash, sha256Hex } from "./normalize";
import { parseCorrectAnswer } from "./correct-answer-parser";

const MAX_RESULTS_PER_SOURCE = 50;
/** How many existing MCQs to pull into memory for near-duplicate scoring.
 * Fine for a bank of low thousands; for a much larger bank, replace this
 * with a subject-scoped query or a real search index — see
 * docs/ADDING_A_SCRAPER.md "Scaling duplicate detection". */
const DUPLICATE_CHECK_POOL_SIZE = 4000;

export interface RunExtractionOptions {
  jobProfileId: string;
  sourceKeys?: string[]; // defaults to all enabled sources
  triggeredBy?: "manual" | "scheduled";
}

/**
 * Creates the ExtractionJob row (status "queued") and returns its id
 * immediately, without running any scrapers yet. Callers (the API route)
 * use this so the HTTP response can return the jobId right away, then kick
 * off processExtractionJob() without awaiting it, and let the client poll
 * /api/mcqs/extraction-status/:jobId for progress — this is what keeps the
 * extraction pipeline from freezing the UI (spec section 12) without
 * needing a separate queue service.
 *
 * Caveat, documented here and in DEPLOYMENT_GUIDE.md: this in-process
 * "fire and forget" approach only keeps running if the Node process stays
 * alive after the response is sent, which is true for `next start` / the
 * Docker deployment this project ships with, but is NOT guaranteed on
 * serverless hosts (e.g. Vercel's default Node functions can be frozen
 * once a response is sent). If you deploy there, swap this for a real
 * queue (BullMQ + Redis, as the original spec suggested) — the
 * processExtractionJob() function below is already isolated so that swap
 * doesn't touch the extraction logic itself.
 */
export async function createExtractionJob(opts: RunExtractionOptions): Promise<string> {
  const jobProfile = await db.jobProfile.findUniqueOrThrow({ where: { id: opts.jobProfileId } });
  const sources = await db.source.findMany({
    where: opts.sourceKeys ? { key: { in: opts.sourceKeys } } : { isEnabled: true }
  });

  const job = await db.extractionJob.create({
    data: {
      jobProfileId: jobProfile.id,
      status: "queued",
      triggeredBy: opts.triggeredBy ?? "manual",
      sourcesRequested: sources.map((s) => s.key).join(",")
    }
  });
  return job.id;
}

export async function processExtractionJob(jobId: string): Promise<void> {
  const job = await db.extractionJob.findUniqueOrThrow({ where: { id: jobId } });
  const jobProfile = await db.jobProfile.findUniqueOrThrow({ where: { id: job.jobProfileId } });

  const requestedKeys = job.sourcesRequested.split(",").filter(Boolean);
  const sources = await db.source.findMany({ where: { key: { in: requestedKeys } } });

  const syllabusRows = await db.syllabusSubject.findMany({
    where: { jobProfileId: jobProfile.id, isActive: true }
  });
  const syllabus: SyllabusSubjectConfig[] = syllabusRows.map((s) => ({
    name: s.name,
    slug: s.slug,
    keywords: s.keywords,
    excludeKeywords: s.excludeKeywords,
    minKeywordHits: s.minKeywordHits,
    isActive: s.isActive
  }));
  const syllabusKeywords = syllabusRows.flatMap((s) => s.keywords.split(",").map((k) => k.trim()).filter(Boolean));

  const existingRows = await db.mcq.findMany({
    where: { jobProfileId: jobProfile.id },
    select: { id: true, questionHash: true, normalizedQuestion: true },
    orderBy: { createdAt: "desc" },
    take: DUPLICATE_CHECK_POOL_SIZE
  });
  const existingPool: ExistingMcqForDupCheck[] = existingRows.map((r) => ({ ...r }));

  await db.extractionJob.update({ where: { id: job.id }, data: { status: "running" } });

  const startedAt = Date.now();
  const totals = { discovered: 0, relevant: 0, duplicate: 0, irrelevant: 0, invalid: 0, saved: 0 };

  try {
    await processSources({ job, jobProfile, sources, syllabus, syllabusKeywords, existingPool, totals });

    await db.extractionJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        questionsDiscovered: totals.discovered,
        relevantCount: totals.relevant,
        duplicateCount: totals.duplicate,
        irrelevantCount: totals.irrelevant,
        invalidCount: totals.invalid,
        savedCount: totals.saved,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt
      }
    });
  } catch (err) {
    // A single broken source is already caught below and turned into an
    // "error" ExtractionSourceResult without aborting the run. This
    // top-level catch is only for genuinely unexpected failures (e.g. a
    // database error) — the job is marked "failed" rather than left stuck
    // on "running" forever, so /admin/extraction-history never shows a
    // silently-hung job.
    await db.extractionJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown extraction error.",
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt
      }
    });
  }
}

interface ProcessSourcesArgs {
  job: { id: string };
  jobProfile: { id: string };
  sources: Array<{ id: string; key: string; name: string }>;
  syllabus: SyllabusSubjectConfig[];
  syllabusKeywords: string[];
  existingPool: ExistingMcqForDupCheck[];
  totals: { discovered: number; relevant: number; duplicate: number; irrelevant: number; invalid: number; saved: number };
}

async function processSources(args: ProcessSourcesArgs): Promise<void> {
  const { job, jobProfile, sources, syllabus, syllabusKeywords, existingPool, totals } = args;

  for (const source of sources) {
    const sourceStart = Date.now();
    const adapter = SCRAPER_REGISTRY[source.key];
    let result: { status: string; mcqs: RawScrapedMcq[]; message?: string };

    if (!adapter) {
      result = { status: "error", mcqs: [], message: `No adapter registered for source key "${source.key}".` };
    } else {
      try {
        const existingIdsForSource = new Set(
          (
            await db.mcq.findMany({
              where: { jobProfileId: jobProfile.id, sourceName: source.name },
              select: { sourceQuestionId: true }
            })
          )
            .map((r) => r.sourceQuestionId)
            .filter((v): v is string => !!v)
        );

        const ctx: ScraperRunContext = {
          syllabusKeywords,
          knownSourceQuestionIds: existingIdsForSource,
          maxResults: MAX_RESULTS_PER_SOURCE
        };
        // Each adapter is responsible for never throwing on "not configured" /
        // "site unreachable" — but we still guard here so one broken source
        // can never take down the rest of the extraction run (spec section 14).
        result = await adapter.run(ctx);
      } catch (err) {
        result = {
          status: "error",
          mcqs: [],
          message: err instanceof Error ? err.message : "Unknown scraper error."
        };
      }
    }

    let found = 0, relevant = 0, duplicate = 0, irrelevant = 0, invalid = 0, saved = 0;

    for (const raw of result.mcqs) {
      found++;
      totals.discovered++;

      const shape = validateMcqShape(raw);
      if (!shape.valid) {
        invalid++;
        totals.invalid++;
        continue;
      }

      const relevance = classifyRelevance(raw, syllabus);
      if (!relevance.relevant || !relevance.subject) {
        irrelevant++;
        totals.irrelevant++;
        continue;
      }
      relevant++;
      totals.relevant++;

      const dup = await checkDuplicate(raw, existingPool);
      if (dup.isDuplicate) {
        duplicate++;
        totals.duplicate++;
        continue;
      }

      const parsedAnswer = parseCorrectAnswer(raw.rawAnswerText, {
        A: raw.optionA, B: raw.optionB, C: raw.optionC, D: raw.optionD
      });

      const normalizedQuestion = normalizeText(raw.question);
      const questionHash = await sha256Hex(normalizeMcqForHash(raw));

      const saved_ = await db.mcq.create({
        data: {
          jobProfileId: jobProfile.id,
          question: raw.question.trim(),
          optionA: raw.optionA.trim(),
          optionB: raw.optionB.trim(),
          optionC: raw.optionC.trim(),
          optionD: raw.optionD.trim(),
          correctOption: parsedAnswer?.option ?? null,
          correctAnswer: parsedAnswer
            ? { A: raw.optionA, B: raw.optionB, C: raw.optionC, D: raw.optionD }[parsedAnswer.option]
            : null,
          subject: relevance.subject,
          sourceName: source.name,
          sourceUrl: raw.sourceUrl,
          sourceQuestionId: raw.sourceQuestionId,
          normalizedQuestion,
          questionHash,
          // No reliable correct answer -> keep out of the live quiz pool and
          // route it to the admin verification queue instead of guessing
          // (spec section 18). It's still saved so nothing is silently lost.
          isActive: parsedAnswer !== null,
          isVerified: false,
          verificationStatus: "auto_imported",
          relevanceConfidence: relevance.confidence,
          relevanceReason: relevance.reason
        }
      });

      existingPool.unshift({ id: saved_.id, questionHash, normalizedQuestion });
      saved++;
      totals.saved++;
    }

    await db.extractionSourceResult.create({
      data: {
        jobId: job.id,
        sourceId: source.id,
        sourceKey: source.key,
        status: result.status === "ok" ? "ok" : result.status === "not_configured" ? "not_configured" : "error",
        found,
        relevant,
        duplicate,
        irrelevant,
        saved,
        errorMessage: result.status === "error" ? result.message : result.status === "not_configured" ? result.message : null,
        durationMs: Date.now() - sourceStart
      }
    });

    await db.source.update({
      where: { id: source.id },
      data: {
        lastRunAt: new Date(),
        questionsFoundLast: found,
        newQuestionsLast: saved,
        errorsLast: result.status === "error" ? result.message ?? null : null,
        status: result.status === "ok" ? "ok" : result.status === "not_configured" ? "not_configured" : "error"
      }
    });
  }
}
