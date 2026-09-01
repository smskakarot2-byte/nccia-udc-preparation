# INSTALLATION_GUIDE.md

This guide assumes no prior experience running a Node.js project. Follow it
top to bottom.

## 1. Install required software

### Node.js

You need Node.js version 18.18 or newer (20 LTS recommended).

- **Windows / macOS**: download the installer from
  https://nodejs.org (choose the "LTS" version) and run it.
- **Linux (Ubuntu/Debian)**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

Verify it installed:

```bash
node -v
npm -v
```

You should see version numbers, not "command not found".

### Git (optional, if you're cloning from a repository)

- **Windows**: https://git-scm.com/download/win
- **macOS**: `brew install git` (or it's already installed with Xcode
  Command Line Tools)
- **Linux**: `sudo apt-get install git`

If you just have the project as a folder/zip already, you can skip Git
entirely.

### Docker (only needed for the Docker/Postgres path — optional)

- https://www.docker.com/products/docker-desktop/ — install, then open it
  once so the background service starts.

You do **not** need Python, and you do **not** need PostgreSQL installed
locally for the default setup below — it uses SQLite, a file-based
database that needs no separate server.

## 2. Get the project onto your computer

If you have the project as a folder already, open a terminal in that
folder and skip to step 3.

If it's a zip file: extract it anywhere, then open a terminal and `cd`
into the extracted `nccia-udc-preparation` folder.

## 3. Install dependencies

```bash
npm install
```

This downloads everything listed in `package.json`. It can take a minute
or two the first time. If it fails, see Troubleshooting below.

## 4. Configure environment variables

Copy the example file:

- **Windows (PowerShell)**: `copy .env.example .env`
- **macOS/Linux**: `cp .env.example .env`

Open `.env` in any text editor and set three things:

**a. `ADMIN_EMAIL`** — any email address you'll use to log into `/admin`.

**b. `ADMIN_PASSWORD_HASH`** — you can't just type a plain password here;
it needs to be a bcrypt hash. Generate one by running:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-chosen-password', 10))"
```

This prints something like `$2a$10$abc123...`. Copy that whole string
(including the `$` signs) into `ADMIN_PASSWORD_HASH` in `.env`, replacing
the placeholder.

**c. `SESSION_SECRET`** — any long random string. Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output into `SESSION_SECRET`.

Leave `DATABASE_URL` as `file:./dev.db` for now — that's the SQLite path,
already correct for this local setup.

## 5. Set up the database

```bash
npm run db:migrate
```

This creates the SQLite database file and all its tables. You'll be
prompted to name the migration the first time — any name (e.g. `init`) is
fine, just press Enter or type a word.

Then load the starter data (syllabus, the 15+1 sources, and demo MCQs):

```bash
npm run db:seed
```

You should see log lines like "Seeded 12 syllabus subjects." and "Seeded
15 demo MCQs."

## 6. Start the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the dashboard
with some demo MCQs already in it.

To log into the admin panel, go to http://localhost:3000/admin/login and
use the email/password you chose in step 4 (the *plain* password, not the
hash).

## 7. Try the core features

- Click **Extract New MCQs** on the dashboard — the Demo source will
  "discover" a few new questions each time, until its small pool runs out
  (then it correctly says "No new relevant MCQs found at this time").
- Go to **Practice**, **Exam Mode**, **Random Test**, or **Subject Test**
  and take a quiz.
- Go to `/admin/mcqs` to edit/verify/delete MCQs, `/admin/sources` to see
  the 15 scraper adapters (all "not configured" — see
  `PROJECT_DOCUMENTATION.md` §2.1 for why), `/admin/syllabus` to edit the
  subjects driving relevance filtering, and `/admin/import` to bring in
  MCQs you've collected yourself.

## 8. Running tests

```bash
npm test
```

## 9. Building for production locally (optional)

```bash
npm run build
npm start
```

## 10. Starting workers / background jobs

There is no separate worker process to start — extraction runs inside the
same Next.js server process (see `PROJECT_DOCUMENTATION.md` §2.4 for why,
and its limits). Nothing extra to configure for local use.

## Troubleshooting

**`npm install` fails with network/permission errors**
Check your internet connection; if you're behind a corporate proxy, you
may need to configure npm's proxy settings (`npm config set proxy ...`).

**`npm run db:migrate` fails with "Environment variable not found: DATABASE_URL"**
You skipped step 4, or saved `.env` in the wrong folder. It must be in the
project root, named exactly `.env` (not `.env.example` or `.env.txt`).

**Admin login says "Invalid email or password"**
Make sure you're typing the *plain* password you hashed in step 4, not the
hash itself. Also double check `ADMIN_EMAIL` in `.env` matches exactly
(case-insensitive) what you're typing.

**Port 3000 already in use**
Stop whatever else is using it, or run `PORT=3001 npm run dev`
(`set PORT=3001 && npm run dev` on Windows cmd, or
`$env:PORT=3001; npm run dev` in PowerShell) and open
http://localhost:3001 instead.

**`prisma generate` / `@prisma/client did not initialize yet` errors**
Run `npm run db:generate` manually, then try again.

**I want to start over with a clean database**
Delete `prisma/dev.db` (and `prisma/dev.db-journal` if present), then
re-run `npm run db:migrate` and `npm run db:seed`.

## What to do next

- Read `PROJECT_DOCUMENTATION.md` for how the pipeline and admin panel fit
  together, and an honest list of what's a working feature vs. a
  documented stub.
- Read `docs/ADDING_A_SCRAPER.md` if you want to wire up a real scraper for
  one of the 15 sites.
- Read `DEPLOYMENT_GUIDE.md` when you're ready to put this somewhere other
  people can reach it.
