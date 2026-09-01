/**
 * Common interface every source adapter implements (spec section 13).
 *
 * IMPORTANT — read before wiring up a real source:
 * This project ships with adapters for all 15 requested websites, but none
 * of them contain real CSS selectors, because the environment this project
 * was generated in has no network access and therefore no way to inspect
 * the live HTML of any of those sites (per spec section 42: "do not guess
 * external website structures"). Each adapter is a complete, correctly
 * typed implementation of ScraperAdapter that:
 *   - has the right key/name/baseUrl,
 *   - fails gracefully with a clear "not_configured" result instead of
 *     returning fabricated MCQs,
 *   - has a single clearly marked TODO block showing exactly where to put
 *     real fetch + parse logic once you've inspected the site yourself and
 *     confirmed you're allowed to scrape it (robots.txt / ToS).
 *
 * See docs/ADDING_A_SCRAPER.md for the step-by-step guide, and
 * src/lib/scrapers/demo.ts for a fully working reference implementation of
 * this same interface (it just draws from a local pool instead of the
 * network, so you can see the whole pipeline run end to end).
 */

export interface RawScrapedMcq {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  /** Whatever raw text the source used to indicate the answer, e.g.
   * "Answer: B" — resolved later by correct-answer-parser.ts. Leave
   * undefined if the source page didn't show one. */
  rawAnswerText?: string;
  subjectHint?: string;
  sourceUrl: string;
  sourceQuestionId?: string;
}

export interface ScraperRunContext {
  /** Search terms derived from the active job profile's syllabus —
   * adapters may use these to hit a source's search/category pages. */
  syllabusKeywords: string[];
  /** Question hashes/IDs already known for this source, so an adapter can
   * skip pages it already fully ingested on a prior run where that's
   * cheaper than re-fetching and letting the pipeline dedupe. Optional —
   * the duplicate-detection pipeline is the source of truth either way. */
  knownSourceQuestionIds: Set<string>;
  /** Upper bound on how many raw MCQs this adapter should return in one
   * run, so one very large source can't starve the others inside a single
   * extraction job. */
  maxResults: number;
}

export type ScraperRunStatus = "ok" | "not_configured" | "error";

export interface ScraperRunResult {
  status: ScraperRunStatus;
  mcqs: RawScrapedMcq[];
  message?: string;
}

export abstract class BaseScraper {
  abstract readonly key: string;
  abstract readonly name: string;
  abstract readonly baseUrl: string;

  /**
   * Entry point the extraction engine calls. Adapters that aren't wired up
   * yet should return { status: "not_configured", mcqs: [] } — never throw,
   * and never invent MCQs to return something non-empty.
   */
  abstract run(ctx: ScraperRunContext): Promise<ScraperRunResult>;
}

/** Thrown by fetchPage()/parseMcqs() helpers below when the environment has
 * no network access, so adapters get a consistent, typed reason to surface
 * in their ScraperRunResult.message. */
export class ScraperNotConfiguredError extends Error {
  constructor(sourceName: string, hint: string) {
    super(`${sourceName}: not yet configured — ${hint}`);
    this.name = "ScraperNotConfiguredError";
  }
}
