# DEPLOYMENT_GUIDE.md

Two practical paths are covered: a **Docker/VPS** deployment (everything
self-hosted, one `docker compose up -d`) and a **managed services**
deployment (frontend on Vercel-like platform, backend on a Node host,
managed Postgres). Pick whichever matches what you have access to. Neither
path was executed end-to-end in the environment that generated this
project (no network access — see `PROJECT_DOCUMENTATION.md` §2.2), so
treat the commands below as accurate instructions to follow and verify
yourself, not as a deployment that's already been tested.

## Before either path: generate real secrets

Don't reuse any example values. From a machine with Node installed:

```bash
node -e "console.log(require('bcryptjs').hashSync('a-strong-password-you-choose', 10))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The first is `ADMIN_PASSWORD_HASH`, the second is `SESSION_SECRET`.

## Path A — Docker on a VPS

This is the simpler path and the one this repo is set up for out of the
box.

### 1. Provision a VPS

Any provider (DigitalOcean, Linode, Hetzner, a spare server, etc.) with at
least 1 GB RAM. Install Docker + Docker Compose:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

### 2. Get the project onto the server

```bash
git clone <your-repo-url> nccia-udc-preparation
cd nccia-udc-preparation
```

(Or `scp`/upload the folder if you're not using Git.)

### 3. Configure environment

```bash
cp .env.example .env
nano .env   # or any editor
```

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (from the step
above), and optionally `POSTGRES_PASSWORD` (change it from the default in
`docker-compose.yml`). Leave `DATABASE_URL` unset here — `docker-compose.yml`
builds it from the `POSTGRES_*` variables automatically.

### 4. Start it

```bash
docker compose up -d
```

This builds the image (switching the Prisma schema to `postgresql` at
build time — see the `Dockerfile`), starts Postgres, runs migrations +
seed via the one-off `migrate` service, then starts the app. Check status:

```bash
docker compose ps
docker compose logs -f app
```

The app listens on port 3000 inside the container, published to port 3000
on the host by default.

### 5. Domain + HTTPS

Put a reverse proxy in front of the container — the simplest option is
[Caddy](https://caddyserver.com/), which handles HTTPS automatically:

```
# /etc/caddy/Caddyfile
your-domain.example {
  reverse_proxy localhost:3000
}
```

```bash
sudo apt-get install -y caddy
sudo systemctl restart caddy
```

Point your domain's DNS `A` record at the server's IP first, then start
Caddy — it will request a Let's Encrypt certificate automatically. Update
`NEXT_PUBLIC_APP_URL` in `.env` to `https://your-domain.example` and
restart: `docker compose up -d --force-recreate app`.

Alternative: an Nginx reverse proxy with `certbot` works the same way if
you prefer it over Caddy.

### 6. Scheduled daily extraction (spec §34)

The app has no built-in cron scheduler process (deliberately — see
`PROJECT_DOCUMENTATION.md` §2.4 on why background jobs are in-process, not
a separate worker). Add a system cron job on the host that hits the
extraction endpoint once a day:

```bash
crontab -e
# Run every day at 2:00 AM server time:
0 2 * * * curl -s -X POST https://your-domain.example/api/mcqs/extract -H 'Content-Type: application/json' -d '{}' >> /var/log/nccia-extraction.log 2>&1
```

Admins can still trigger extraction manually any time from the dashboard —
that's the same endpoint.

### 7. Logs

```bash
docker compose logs -f app       # application logs
docker compose logs -f postgres  # database logs
```

### 8. Backups

Postgres data lives in the `pgdata` Docker volume. Back it up with:

```bash
docker compose exec postgres pg_dump -U nccia nccia_udc > backup-$(date +%F).sql
```

Restore into a fresh database with:

```bash
cat backup-2026-08-31.sql | docker compose exec -T postgres psql -U nccia nccia_udc
```

Automate the `pg_dump` line with the same cron approach as extraction,
piping to a dated file and rotating old ones.

### 9. Updating the application

```bash
git pull
docker compose build
docker compose up -d
```

The `migrate` service re-runs `prisma migrate deploy` (safe/idempotent for
already-applied migrations) before the app restarts.

### 10. Monitoring

At minimum, monitor `GET /api/health` (used by the container's own
`HEALTHCHECK`, so `docker compose ps` already shows `healthy`/`unhealthy`).
For anything beyond that (uptime alerts, log aggregation), wire up
whatever your hosting provider offers or a external uptime-check service
pointed at `/api/health`.

## Path B — Managed services

```
Frontend + Backend (same Next.js app)
        ↓
A Node hosting platform (Render, Railway, Fly.io, or similar — needs to
run a persistent Node process for the in-process extraction job runner
to work correctly; see the caveat below)
        ↓
Managed PostgreSQL (the same platform's managed Postgres add-on, or
Supabase/Neon/RDS)
```

### Important caveat before choosing this path

The extraction pipeline's background-job mechanism (§2.4 in
`PROJECT_DOCUMENTATION.md`) relies on the Node process staying alive after
an HTTP response is sent. That's true on a persistent Node host (Render,
Railway, Fly.io, a plain VPS) but is **not guaranteed** on a platform whose
functions can be frozen immediately after responding (some serverless
function platforms behave this way for their default Node runtime). If you
deploy to a platform like that, either:

- confirm with their docs that background work after `return` is
  supported (some offer this as an explicit feature), or
- replace the in-process runner with a real queue (BullMQ + Redis, as the
  original spec suggested) — `processExtractionJob()` in
  `src/lib/extraction-engine.ts` is already isolated from the HTTP layer
  specifically so this swap doesn't touch the pipeline logic itself.

### Steps

1. **Database**: create a managed Postgres instance (Supabase, Neon,
   Railway Postgres, RDS, etc.). Copy its connection string.
2. **Schema**: before deploying, change `prisma/schema.prisma`'s
   `datasource db { provider = "sqlite" }` to `provider = "postgresql"`
   (the Docker path does this automatically at build time; for a manual
   deploy, edit the file directly, or point `npm run build` in your host's
   build settings at a build script that does the same `sed` the
   `Dockerfile` does).
3. **App host**: create a new Node web service, point it at this repo.
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL` (from step 1), `ADMIN_EMAIL`,
     `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`
     (your public URL), `ENABLED_SOURCES=demo`.
4. **Run migrations once**, from your local machine (pointed at the
   production `DATABASE_URL`) or via a one-off command on the host:
   ```bash
   DATABASE_URL="<your production URL>" npx prisma migrate deploy
   DATABASE_URL="<your production URL>" npx prisma db seed
   ```
5. **Domain + HTTPS**: most of these platforms provision HTTPS
   automatically once you attach a custom domain in their dashboard —
   follow their specific instructions.
6. **Scheduled extraction**: use the platform's own cron/scheduled-job
   feature (most of Render/Railway/Fly offer one) to `POST` to
   `/api/mcqs/extract` daily, same as the crontab example in Path A.
7. **Backups**: use the managed Postgres provider's built-in backup
   feature rather than rolling your own.

## Security checklist before going live

- [ ] `ADMIN_PASSWORD_HASH` is a real bcrypt hash of a strong password, not
      the placeholder.
- [ ] `SESSION_SECRET` is a real random value, not the placeholder.
- [ ] `.env` (or your host's secret manager) is never committed to Git.
- [ ] HTTPS is enforced (no plain HTTP admin login).
- [ ] Database credentials are not the Docker Compose defaults if you're
      exposing Postgres's port publicly (better: don't publish port 5432
      externally at all — remove the `ports:` mapping under `postgres:` in
      `docker-compose.yml` once you don't need to connect to it directly).
- [ ] You've read `PROJECT_DOCUMENTATION.md` §2 so you know which parts of
      the system (scrapers) are documented stubs before relying on them.
