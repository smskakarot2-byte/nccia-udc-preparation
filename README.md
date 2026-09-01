# NCCIA UDC Preparation

A complete MCQ preparation platform for the **NCCIA — Upper Division Clerk
(UDC)** job test in Pakistan: a quiz engine (Practice / Exam / Random /
Subject modes), a dashboard, an admin panel, and an MCQ ingestion pipeline
(validation → relevance filtering against a configurable syllabus →
duplicate detection → correct-answer parsing → save) that both automated
scraper adapters and a manual import tool feed into.

**Read this first:** [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md)
explains what's real, what's a documented stub, and why — in particular the
15 requested scraper sources. Short version: this project was built in an
environment with **no network access**, so their live HTML structure could
never be inspected, and per the original spec ("do not guess external
website structures") they ship as adapters with the right interface,
correct source metadata, and a clear activation TODO — not fabricated
selectors. The app is fully usable today via its **Demo** source and the
**manual import** pipeline (`/admin/import`), which run through the exact
same validation/relevance/duplicate-detection/save pipeline real scrapers
would.

## Quick start (local, SQLite, zero external services)

```bash
npm install
cp .env.example .env
# edit .env: set ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET (see comments in .env.example)
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. Admin panel: http://localhost:3000/admin/login.

Full walkthrough (including how to generate `ADMIN_PASSWORD_HASH`, Windows
commands, and troubleshooting): see
[`INSTALLATION_GUIDE.md`](./INSTALLATION_GUIDE.md).

## Docker (Postgres, production-shaped)

```bash
cp .env.example .env   # fill in ADMIN_EMAIL / ADMIN_PASSWORD_HASH / SESSION_SECRET
docker compose up -d
```

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for deploying this
somewhere other people can reach, plus a from-scratch explanation of the
Docker setup.

## Verifying it works

```bash
npm test          # unit tests: normalization, duplicate detection,
                   # relevance filtering, correct-answer parsing
npm run build      # production build
npm run lint       # eslint
```

**Important — read this:** the code in this repository was written without
being able to run `npm install` (no network access in the build
environment). It was checked with the TypeScript compiler in
syntax-verification mode (no structural/syntax errors found) and reviewed
carefully, but `npm install`, `npm run build`, `npm run dev`, and `npm
test` have **not** been executed end-to-end by whoever/whatever generated
this project. Please run the commands above yourself as the real
verification step before relying on this — see the "Known limitations"
section of `PROJECT_DOCUMENTATION.md` for the full, honest list of what
was and wasn't possible to check.

## Project structure

```
nccia-udc-preparation/
├── src/
│   ├── app/            # Next.js App Router — pages + API routes
│   ├── components/     # Shared React components
│   └── lib/            # Business logic: relevance filter, duplicate
│       └── scrapers/    # detection, extraction engine, auth, scrapers
├── prisma/             # schema.prisma + seed.ts
├── tests/              # Vitest unit tests
├── docs/               # ADDING_A_SCRAPER.md and friends
├── docker-compose.yml, Dockerfile
├── PROJECT_DOCUMENTATION.md
├── INSTALLATION_GUIDE.md
├── DEPLOYMENT_GUIDE.md
└── PROJECT_GUIDE.pdf
```

## License

MIT — see `LICENSE`.
