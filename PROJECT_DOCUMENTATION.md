# PROJECT_DOCUMENTATION.md

## 1. Purpose

A preparation platform for the **NCCIA — Upper Division Clerk (UDC)** job
test: a growing bank of relevant, deduplicated, source-attributed MCQs, a
quiz engine with several study modes, a dashboard, and an admin panel to
curate the bank. It's built as a "job profile" system (§13 below) so the
same app can later serve other posts (FIA, ASF, Police, PPSC, FPSC, NADRA,
...) without a rebuild.

## 2. Read this before anything else: what's real vs. documented-stub

This project was generated in a sandboxed environment with **no network
access** — no way to `npm install`, no way to fetch any of the 15 requested
websites, no way to run the app. That constraint shaped several concrete
decisions, listed here up front rather than buried in a "limitations"
section at the end, because they materially affect what you get on day one.

### 2.1 The 15 scraper sources are documented stubs, not working scrapers

`src/lib/scrapers/sources/*.ts` contains one file per requested site
(TestPoint, GoTest, PakMcqs, PakMCQs.org, Ilmkidunya, TayyarHo, Pak Job
MCQs, TestPointsPK, Talib.pk, TestPointPK, JobsAlert.pk, Parho Pakistan,
Educated.pk, PaperPK, StudyInfo.pk). Each one:

- correctly implements the shared `BaseScraper` interface,
- has the right key/name/best-guess base URL,
- **returns `{ status: "not_configured", mcqs: [] }`** — it does not fetch
  anything, and it never fabricates an MCQ,
- has a comment block explaining exactly what to inspect and implement to
  make it real (also written up as a walkthrough in
  `docs/ADDING_A_SCRAPER.md`).

This is a direct consequence of two things the original request itself
requires: "do not guess external website structures" (only possible by
inspecting the live site, which required network access this environment
didn't have) and "respect robots.txt / ToS / rate limits" (which also
requires being able to check them first). Writing selectors against sites
that were never actually loaded would have been guessing dressed up as
implementation — exactly what was asked not to do.

**What is real:** the one adapter that's supposed to be, `src/lib/scrapers/demo.ts`.
It draws from a local, clearly labeled pool (`source_name = "Demo"`,
never presented as scraped content) and is a fully working reference
implementation of the same interface — so the entire pipeline (validate →
relevance-filter → duplicate-detect → parse-answer → save) is exercised
for real every time you click "Extract New MCQs", and repeated clicks
genuinely surface new questions until the pool is exhausted, then correctly
report "No new relevant MCQs found at this time."

**The practical path to real content today** is the manual ingestion
pipeline: `POST /api/mcqs/import` / the `/admin/import` page. It runs
anything you paste or upload through the identical pipeline a working
scraper's output would go through. This is the honest way to get
real, source-attributed MCQs from those 15 sites into the bank right now,
if you collect them yourself in a way that respects each site's terms.

### 2.2 The code has not been run in this environment

`npm install` requires the npm registry; this sandbox has none. Every file
here is real, complete, non-pseudocode TypeScript/TSX — but it was written
and reviewed without ever running `npm run dev`, `npm run build`, or
`npm test`. It was passed through the TypeScript compiler in
syntax-verification mode (structural/syntax check only, since full
type-checking needs `node_modules` this environment couldn't install) and
came back clean, and it was reviewed file by file — but that is not the
same as an executed build, and you should treat "does this actually start"
as an open question until you run the commands in `INSTALLATION_GUIDE.md`
yourself. If something doesn't compile, it's a real bug to fix, not a
pretended success — please treat any error you hit as legitimate feedback
rather than assuming you did something wrong.

### 2.3 The syllabus is a documented reconstruction, not a confirmed official document

No official NCCIA UDC syllabus could be located/verified (again: no network
access to check). `src/lib/default-syllabus.ts` is a reasonable
reconstruction based on what UDC/NTS-style clerical tests in Pakistan
typically cover — see the comment at the top of that file for the exact
reasoning. Edit it from `/admin/syllabus` once you have the real
advertisement/syllabus in hand; nothing else in the app needs to change
when you do, since the relevance filter reads this configuration at
runtime.

### 2.4 Background jobs are in-process, not Celery/Redis or BullMQ

The extraction pipeline runs as an async job inside the Next.js server
process (see `src/lib/extraction-engine.ts` — `createExtractionJob()` +
`processExtractionJob()`) with progress tracked in the database and polled
by the client, rather than a separate queue service. This keeps the UI from
freezing without adding Redis/Celery/BullMQ as a hard dependency, and it
works correctly under the `next start` / Docker deployment this project
ships with. It is **not** guaranteed to work on a purely serverless host
(e.g. a platform that can freeze a function immediately after it returns a
response) — see the comment on `createExtractionJob()` for the documented
upgrade path if you deploy there.

### 2.5 Database default is SQLite, not PostgreSQL

`prisma/schema.prisma` ships with `provider = "sqlite"` so the app runs
with zero external services for local development and grading/testing.
The Docker build (`Dockerfile`) switches this to `postgresql` at image
build time (`sed` step) and `docker-compose.yml` provisions a real Postgres
container — that's the production path. See §5.3.

None of the above are hidden — every one of these decisions is commented
at the exact place in the code where it matters, not just here.

## 3. Architecture

```
                  ┌──────────────────────┐
                  │   Next.js App Router │  React/TS UI + API routes
                  └──────────┬───────────┘
                             │
             ┌───────────────┼────────────────┐
             ▼                                 ▼
     Prisma ORM (SQLite dev /            In-process extraction
     Postgres prod)                      job runner (async, polled)
             │                                 │
             ▼                                 ▼
        MCQ / Source / Syllabus /        Scraper adapter registry
        ExtractionJob / TestAttempt      (15 stubs + 1 working demo)
        tables
                                                │
                                                ▼
                                  Shared pipeline: validate shape →
                                  classify relevance (syllabus) →
                                  detect duplicate (hash + Jaccard/
                                  TF-IDF cosine) → parse correct answer →
                                  save
```

## 4. Database

See `prisma/schema.prisma` for the authoritative definition. Key models:
`JobProfile` (syllabus/source configuration scope, §13), `SyllabusSubject`
(keyword rules per subject), `Source` (one row per adapter, tracks
enabled/status/last-run stats), `Mcq` (the bank — every field from the
original spec's field list is present, plus `verificationStatus`,
`relevanceConfidence`/`relevanceReason` for auditability), `ExtractionJob` +
`ExtractionSourceResult` (extraction history and live progress),
`TestAttempt` + `TestAttemptAnswer` (quiz sessions and grading).

Enum-like fields (`correctOption`, `difficulty`, `verificationStatus`,
source/job status, test mode) are plain validated `String` columns rather
than Prisma `enum`, specifically so the same schema file works for both
SQLite and PostgreSQL without edits — see the comment at the top of
`schema.prisma`.

## 5. Backend

### 5.1 API

All routes are under `src/app/api/`. Notably:

- `POST /api/mcqs/extract` — starts an extraction job, returns
  immediately with a `jobId` (HTTP 202).
- `GET /api/mcqs/extraction-status/:jobId` — polled for live progress.
- `POST /api/mcqs/import` — the manual ingestion pipeline (§2.1), same
  validation/relevance/dedup/save path as extraction.
- `GET /api/mcqs` — paginated, filterable, searchable listing (server-side
  pagination — never dumps the full table).
- `GET /api/tests/random|subject/:subject`, `POST /api/tests/submit`,
  `POST /api/tests/check-answer` — quiz session lifecycle. Correct answers
  are never sent to the client ahead of grading/reveal; Practice Mode's
  immediate feedback is a real per-question server round trip
  (`check-answer`), not client-side data the UI merely hides.
- `POST /api/admin/login`, `/api/admin/sources/:name`,
  `/api/admin/syllabus`, `/api/admin/job-profiles` — admin-only, gated by
  `getAdminSession()`.
- `GET /api/health` — used by the Docker healthcheck.

### 5.2 Duplicate detection (`src/lib/duplicate-detection.ts`)

Two layers, matching the spec's "possible implementation" list:

1. **Exact**: full Unicode/case/whitespace/punctuation normalization
   (`src/lib/normalize.ts`) of the question + a sorted, normalized set of
   the four options, hashed with SHA-256. Verbatim repeats, formatting
   variants ("...Pakistan?" vs "...Pakistan ?"), and case variants all
   normalize to the same hash.
2. **Near**: token-set Jaccard similarity plus a lightweight TF-IDF cosine
   pass over the comparison pool (no embeddings/external model — this
   needed to work with zero network access, and stays dependency-free by
   design). A configurable threshold (default `0.72`,
   `DEFAULT_NEAR_DUPLICATE_THRESHOLD`) decides the cutoff. Covers the
   spec's paraphrase example ("Who founded Pakistan?" vs "Pakistan was
   founded by whom?") without over-triggering on merely topically similar
   but genuinely different questions — see `tests/duplicate-detection.test.ts`
   for both directions.

### 5.3 Relevance filtering (`src/lib/relevance-filter.ts`)

Rule-based, configurable per job profile: each `SyllabusSubject` has
comma-separated include/exclude keyword lists and a minimum-hit threshold.
A question is relevant if it clears the threshold for at least one active
subject and isn't caught by that subject's exclude list (used to keep
e.g. "computer" broad-matches away from genuinely advanced CS topics like
Kubernetes/distributed systems). No paid AI classification is wired up by
default (the original spec explicitly asked for this to be optional and
not a hard dependency) — the rule-based layer is what the app relies on
out of the box. `AI_RELEVANCE_ENABLED` in `.env.example` documents where an
optional LLM double-check layer would plug in if you want to add one later.

### 5.4 Correct-answer parsing (`src/lib/correct-answer-parser.ts`)

Recognizes `Answer: B`, `Correct Answer: <text>`, `Ans: B`,
`Correct: Option B`, a bare `(B)`, and matches free-text answers against
option text as a fallback. Returns `null` — never a guess — when nothing
resolves; the extraction/import pipeline then saves the MCQ but keeps it
out of the live quiz pool (`isActive = false`) until an admin verifies it
from `/admin/mcqs`.

### 5.5 Job profile system (§13 of the original spec)

Every syllabus subject, source-enablement setting, and MCQ row is scoped to
a `JobProfile`. `/admin/job-profiles` lets you create a new one (e.g. for
FIA or PPSC) and switch which one is "default" (active) — the public quiz
pages and dashboard always read from the default profile. Adding a new
post type is therefore a data change (new profile + new syllabus rows),
not a code change.

## 6. Frontend

Next.js App Router, TypeScript, Tailwind. Design tokens (deep "civil
service" navy/ink, an emerald "pass" accent, a gold "merit" accent;
Lexend for display type, Inter for body) live in `tailwind.config.ts` and
`src/app/globals.css`. Dark/light mode via `next-themes`; a desktop sidebar
collapses to a bottom nav + hamburger-free top bar under `768px`. Toasts,
empty states, skeleton loaders, and error states are all real components
(`src/components/ui.tsx`, `src/components/toast.tsx`) used consistently
rather than one-off inline markup.

The quiz UI (`src/components/quiz-card.tsx`, `src/components/quiz-runner.tsx`)
implements the exact state machine from the spec: neutral → selected (blue)
→ revealed correct (green) / revealed incorrect (red), with the correct
answer never shown before a selection is made.

## 7. Admin panel

`/admin/login` (unprotected) + everything else under `/admin` (protected by
a server-side session check in `src/app/admin/(protected)/layout.tsx`,
redirecting to login otherwise). Covers: MCQ CRUD + verify/reject
(`/admin/mcqs`), source enable/disable (`/admin/sources`), syllabus editing
(`/admin/syllabus`), extraction history with per-source drill-down
(`/admin/extraction-history`), manual import (`/admin/import`), and job
profile management (`/admin/job-profiles`).

Auth is intentionally minimal: one admin account from `.env`
(`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`), bcrypt-checked, JWT session cookie
(`src/lib/auth.ts`). No separate users table — see that file's top comment
for how to extend it to multiple accounts/roles if you need that later.

## 8. Security

- Admin routes require a valid session (`getAdminSession()`); mutating
  public routes (test submission) validate input with `zod`
  (`src/lib/types.ts`).
- Passwords are never stored in plaintext — only a bcrypt hash, supplied by
  you via `.env`.
- A small in-memory rate limiter guards the login endpoint
  (`src/app/api/admin/login/route.ts`) — documented there as a
  single-instance mitigation, with a note on what to swap in for a
  multi-instance production deployment.
- `.env.example` contains no real secrets; `.gitignore` excludes `.env`
  and the local SQLite file.
- No API keys are used in any client-side code.
- SQL injection: mitigated structurally by using Prisma's query builder
  everywhere (no raw string-interpolated SQL) except the `SELECT 1`
  healthcheck, which takes no input.

## 9. Testing

`tests/*.test.ts` (Vitest) cover the parts of the system that are pure
logic and therefore cheap to test without a database or network:
normalization, exact/near duplicate detection (including both of the
spec's own examples), the rule-based relevance classifier (including its
exclude-keyword behavior), and correct-answer format parsing. Run with
`npm test`. These were written carefully and reasoned through by hand
(see the inline comments where a specific token-overlap calculation is
walked through), but — consistent with §2.2 — have not actually been
executed in this environment; run them yourself as part of verification.

## 10. Deployment

See `DEPLOYMENT_GUIDE.md` for the full walkthrough (Docker/VPS path, and a
managed-services path). Short version: `docker compose up -d` builds
against Postgres and runs migrations + seed automatically before starting
the app.

## 11. Future improvements

- Wire up real scrapers per `docs/ADDING_A_SCRAPER.md`, once each site's
  structure has been inspected and its terms checked.
- Swap the in-process job runner for BullMQ + Redis if deploying to a
  serverless host, or if extraction volume grows enough to want a real
  queue with retries/concurrency control.
- Swap the in-memory duplicate-detection comparison pool for a
  subject-scoped query or a real search index once the bank is large (see
  `docs/ADDING_A_SCRAPER.md` → "Scaling duplicate detection").
- Add a real multi-account admin/user system if more than one curator
  needs access.
- Add the optional AI relevance double-check layer (`AI_RELEVANCE_ENABLED`)
  if the rule-based filter's false-positive/negative rate needs improving
  once real content is flowing in.
