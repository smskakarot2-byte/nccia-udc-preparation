import { PrismaClient } from "@prisma/client";
import { DEFAULT_JOB_PROFILE, DEFAULT_SYLLABUS } from "../src/lib/default-syllabus";
import { SOURCE_SEED_LIST } from "../src/lib/scrapers/registry";
import { DEMO_POOL } from "../src/lib/scrapers/demo-pool";
import { validateMcqShape, classifyRelevance, SyllabusSubjectConfig } from "../src/lib/relevance-filter";
import { normalizeText, normalizeMcqForHash, sha256Hex } from "../src/lib/normalize";
import { parseCorrectAnswer } from "../src/lib/correct-answer-parser";

const db = new PrismaClient();

/** How many of the 25 demo-pool MCQs to pre-load at seed time. The rest
 * stay in the pool so clicking "Extract New MCQs" after seeding
 * demonstrates the pipeline actually finding new questions on real runs,
 * per spec section 3 ("if the same button is clicked 10 times, it should
 * NOT simply display the same questions 10 times"). */
const SEED_COUNT = 15;

async function main() {
  console.log("Seeding NCCIA UDC Preparation database...");

  const jobProfile = await db.jobProfile.upsert({
    where: { key: DEFAULT_JOB_PROFILE.key },
    update: {},
    create: {
      key: DEFAULT_JOB_PROFILE.key,
      name: DEFAULT_JOB_PROFILE.name,
      description: DEFAULT_JOB_PROFILE.description,
      isDefault: true,
      isActive: true
    }
  });
  console.log(`Job profile ready: ${jobProfile.name}`);

  for (const [i, subject] of DEFAULT_SYLLABUS.entries()) {
    await db.syllabusSubject.upsert({
      where: { jobProfileId_slug: { jobProfileId: jobProfile.id, slug: subject.slug } },
      update: {
        keywords: subject.keywords.join(","),
        excludeKeywords: (subject.excludeKeywords ?? []).join(",")
      },
      create: {
        jobProfileId: jobProfile.id,
        name: subject.name,
        slug: subject.slug,
        keywords: subject.keywords.join(","),
        excludeKeywords: (subject.excludeKeywords ?? []).join(","),
        minKeywordHits: subject.minKeywordHits ?? 1,
        isActive: true,
        sortOrder: i
      }
    });
  }
  console.log(`Seeded ${DEFAULT_SYLLABUS.length} syllabus subjects.`);

  for (const source of SOURCE_SEED_LIST) {
    await db.source.upsert({
      where: { key: source.key },
      update: {},
      create: {
        key: source.key,
        name: source.name,
        baseUrl: source.baseUrl,
        status: source.status,
        isEnabled: source.isEnabled,
        notes:
          source.key === "demo"
            ? "Fully working reference adapter — draws from a local demo pool, never the network."
            : "Documented stub — no verified selectors yet. See src/lib/scrapers/sources/ for activation steps."
      }
    });
  }
  console.log(`Seeded ${SOURCE_SEED_LIST.length} sources.`);

  const syllabusRows = await db.syllabusSubject.findMany({ where: { jobProfileId: jobProfile.id } });
  const syllabus: SyllabusSubjectConfig[] = syllabusRows.map((s) => ({
    name: s.name, slug: s.slug, keywords: s.keywords, excludeKeywords: s.excludeKeywords,
    minKeywordHits: s.minKeywordHits, isActive: s.isActive
  }));

  const existingCount = await db.mcq.count({ where: { jobProfileId: jobProfile.id, sourceName: "Demo" } });
  if (existingCount > 0) {
    console.log(`Demo MCQs already present (${existingCount}) — skipping MCQ seed.`);
  } else {
    let saved = 0;
    for (const raw of DEMO_POOL.slice(0, SEED_COUNT)) {
      const shape = validateMcqShape(raw);
      if (!shape.valid) continue;
      const relevance = classifyRelevance(raw, syllabus);
      if (!relevance.relevant || !relevance.subject) continue;

      const parsedAnswer = parseCorrectAnswer(raw.rawAnswerText, {
        A: raw.optionA, B: raw.optionB, C: raw.optionC, D: raw.optionD
      });
      const normalizedQuestion = normalizeText(raw.question);
      const questionHash = await sha256Hex(normalizeMcqForHash(raw));

      await db.mcq.create({
        data: {
          jobProfileId: jobProfile.id,
          question: raw.question, optionA: raw.optionA, optionB: raw.optionB, optionC: raw.optionC, optionD: raw.optionD,
          correctOption: parsedAnswer?.option ?? null,
          correctAnswer: parsedAnswer
            ? { A: raw.optionA, B: raw.optionB, C: raw.optionC, D: raw.optionD }[parsedAnswer.option]
            : null,
          subject: relevance.subject,
          sourceName: "Demo",
          sourceUrl: raw.sourceUrl,
          sourceQuestionId: raw.sourceQuestionId,
          normalizedQuestion,
          questionHash,
          isActive: parsedAnswer !== null,
          isVerified: true, // demo content is trusted by construction, unlike real extraction output
          verificationStatus: "verified",
          relevanceConfidence: relevance.confidence,
          relevanceReason: relevance.reason
        }
      });
      saved++;
    }
    console.log(`Seeded ${saved} demo MCQs (source_name = "Demo"). ${DEMO_POOL.length - saved} remain in the pool for "Extract New MCQs" to discover.`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
