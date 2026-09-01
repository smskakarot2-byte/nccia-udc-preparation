import {
  BaseScraper,
  ScraperRunContext,
  ScraperRunResult
} from "../base";

/**
 * Adapter for JobsAlert.pk (https://jobsalert.pk).
 *
 * STATUS: not configured. This build has no network access, so the live
 * HTML structure of this site has not been inspected and no selectors have
 * been written (spec section 42 — never guess selectors). The base URL
 * above is a best-guess and has NOT been verified; confirm it still
 * resolves to the right site before doing anything else.
 *
 * TODO to activate this adapter:
 *   1. Confirm https://jobsalert.pk is correct, and check /robots.txt and the site's
 *      Terms of Service for whether automated access is permitted at all,
 *      and under what rate limits.
 *   2. If permitted, inspect the site's MCQ listing/search pages and note
 *      the real selectors (question, four options, answer text, category).
 *   3. Implement fetchAndParse() below: fetch the relevant pages (respect
 *      robots.txt + a polite delay between requests) and map each MCQ into
 *      a RawScrapedMcq — see src/lib/scrapers/base.ts for the shape, and
 *      src/lib/scrapers/demo.ts for a working end-to-end example of what
 *      an adapter's output feeds into.
 *   4. Change STATUS above (and this file's behavior) so run() returns
 *      { status: "ok", mcqs: [...] } instead of "not_configured".
 *   5. Enable the source from /admin/sources once you've tested it.
 */
export class JobsalertScraper extends BaseScraper {
  readonly key = "jobsalert";
  readonly name = "JobsAlert.pk";
  readonly baseUrl = "https://jobsalert.pk";

  async run(_ctx: ScraperRunContext): Promise<ScraperRunResult> {
    // Intentionally does not fetch anything yet — see the TODO above.
    // Returning an empty, clearly labeled result instead of fabricating
    // MCQs, per spec sections 39 and 42.
    return {
      status: "not_configured",
      mcqs: [],
      message:
        "JobsAlert.pk adapter has no verified selectors yet. See the TODO block " +
        "in src/lib/scrapers/sources/jobsalert.ts for activation steps."
    };
  }
}
