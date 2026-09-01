import { BaseScraper, ScraperRunContext, ScraperRunResult } from "./base";
import { DEMO_POOL } from "./demo-pool";

/**
 * The one adapter in this project that is actually "live" — on purpose.
 * It never touches the network; it hands out a batch of items from
 * demo-pool.ts that the caller (extraction-engine.ts) hasn't already
 * stored, so you can click "Extract New MCQs" repeatedly and see genuinely
 * new questions arrive each time, then correctly see "no new relevant
 * MCQs" once the pool runs out — the same behavior the real scrapers will
 * have once they're wired up, without needing any of them configured.
 *
 * Every MCQ this returns is saved with sourceName = "Demo" and is never
 * presented as having come from a real website (spec section 28).
 */
export class DemoScraper extends BaseScraper {
  readonly key = "demo";
  readonly name = "Demo";
  readonly baseUrl = "https://example-demo.local";

  async run(ctx: ScraperRunContext): Promise<ScraperRunResult> {
    const fresh = DEMO_POOL.filter(
      (item) => !item.sourceQuestionId || !ctx.knownSourceQuestionIds.has(item.sourceQuestionId)
    );

    if (fresh.length === 0) {
      return {
        status: "ok",
        mcqs: [],
        message: "Demo pool exhausted — every demo MCQ has already been imported."
      };
    }

    const batch = fresh.slice(0, Math.min(ctx.maxResults, 8));
    return { status: "ok", mcqs: batch };
  }
}
