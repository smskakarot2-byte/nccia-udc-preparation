# Adding a real scraper adapter

Every adapter under `src/lib/scrapers/sources/*.ts` currently returns
`{ status: "not_configured", mcqs: [] }` — a complete, correctly typed
implementation of `BaseScraper` (see `src/lib/scrapers/base.ts`) that does
nothing yet, on purpose. This project was built with no network access, so
none of the 15 requested sites' HTML structure could be inspected, and the
spec (section 42) explicitly says not to guess selectors. This guide is how
you activate one for real.

## 0. Check you're allowed to

Before writing any code:

1. Fetch `https://<site>/robots.txt` and confirm the pages you want aren't
   disallowed.
2. Read the site's Terms of Service for language about automated access,
   scraping, or reuse of their content.
3. Decide on a rate limit you'll respect (a fixed delay between requests is
   the simplest — a few seconds is a reasonable starting point for a small
   site).

If a site disallows scraping, don't build an adapter for it — leave it
`not_configured` and use the manual import pipeline instead
(`POST /api/mcqs/import`, or the `/admin/import` page) for content you've
collected by hand from that source, respecting the same terms.

## 1. Inspect the real structure

Open the site's MCQ listing/search/category pages in a browser, view source
or use devtools, and note:

- The URL pattern for a page (or API endpoint) listing MCQs for a topic.
- The CSS selector (or JSON path, if there's an API) for: the question
  text, each of the four options, and however the correct answer is shown.
- Pagination — how to get the next page of results.
- Anything identifying an MCQ uniquely on that site (a URL slug, a numeric
  ID) — this becomes `sourceQuestionId`.

## 2. Implement `run()`

Open `src/lib/scrapers/sources/<key>.ts`. Replace the body of `run()`:

```ts
async run(ctx: ScraperRunContext): Promise<ScraperRunResult> {
  try {
    const mcqs: RawScrapedMcq[] = [];
    // Use ctx.syllabusKeywords to build search/category URLs.
    // Use ctx.knownSourceQuestionIds to skip pages you've already fully
    // ingested, if the site lets you fetch by page/ID predictably.
    // Respect ctx.maxResults as an upper bound.

    const res = await fetch(`${this.baseUrl}/search?q=...`, {
      headers: { "User-Agent": "NCCIA-UDC-Prep/1.0 (contact: you@example.com)" }
    });
    const html = await res.text();

    // Parse `html` (e.g. with `cheerio`, added as a new dependency) into
    // RawScrapedMcq objects — question, optionA-D, rawAnswerText,
    // subjectHint, sourceUrl, sourceQuestionId.

    return { status: "ok", mcqs };
  } catch (err) {
    return {
      status: "error",
      mcqs: [],
      message: err instanceof Error ? err.message : "Unknown error."
    };
  }
}
```

Do not fabricate a `RawScrapedMcq` for anything you couldn't actually parse
— skip it. The pipeline (`src/lib/extraction-engine.ts`) already rejects
structurally invalid MCQs, off-syllabus MCQs, and duplicates on its own;
your adapter's only job is to return what it genuinely found.

## 3. Update the STATUS comment and the registry seed status

Once `run()` does real work, update the doc-comment at the top of the file
and change `status: s.key === "demo" ? "ok" : "not_configured"` in
`src/lib/scrapers/registry.ts`'s `SOURCE_SEED_LIST` if you want new
installs to seed this source as enabled by default (existing installs:
just flip it on from `/admin/sources`).

## 4. Test it in isolation first

Write a quick script (or a Vitest test with network access) that calls
`new YourScraper().run(ctx)` directly and inspect the output before letting
it run inside a full extraction job — that way a selector mistake shows up
as an empty/garbled result you can see immediately, not as silently wrong
data.

## Scaling duplicate detection

`src/lib/extraction-engine.ts` loads up to `DUPLICATE_CHECK_POOL_SIZE`
(4000 by default) recent MCQs into memory to compare each new candidate
against. That's fine for a bank of low thousands. If you activate several
real sources and the bank grows much larger, replace that in-memory pass
with either:

- A subject-scoped query (only compare against existing MCQs already
  classified into the same subject), or
- A real search index (e.g. Postgres full-text search, or an external
  vector/search service) queried for the top-N most similar existing
  questions instead of scanning everything.

The `checkDuplicate()` function in `src/lib/duplicate-detection.ts` doesn't
care where its `existing` array comes from, so this is a swap at the call
site, not a rewrite of the detection logic itself.
