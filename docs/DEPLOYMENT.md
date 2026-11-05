# PrintReady — Deployment Guide

This guide takes you from this repository to a live, independently-hosted
production deployment. No step requires the original developer.

## 0. What you're deploying

Two services:

1. **`/` (repo root)** — the Next.js app. Deploy to Vercel (recommended) or
   any Node.js host.
2. **`/pdf-service`** — the Python/FastAPI PDF analysis engine. Deploy to
   Render, Railway, Fly.io, or any host that runs a long-lived Docker
   container / Python process (this is **not** a good fit for Vercel's
   serverless functions because of native PDF-rendering dependencies and
   processing time).

## 1. Provision Supabase (5–10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, paste and run the full contents of
   `supabase/migrations/0001_init.sql`.
3. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never
     expose client-side)
4. In **Authentication → Providers**, Email sign-in is enabled by default.
   Configure a custom SMTP sender under **Authentication → Email Templates**
   so password-reset emails arrive from your own domain (otherwise Supabase's
   shared sender has low daily limits — fine for testing, not for launch).

Once these three env vars are set anywhere the Next.js app runs, it
automatically switches from the local SQLite demo adapter to Supabase — see
`src/lib/db/index.ts`. No code changes required.

## 2. Deploy the PDF processing service

### Option A — Render (simplest)

1. Push this repo to GitHub.
2. In Render, create a **Web Service** pointed at the `/pdf-service`
   directory.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add a persistent disk mounted at `/app/storage` (or wherever
   `PRINTREADY_STORAGE_DIR` points) — Render's free tier has ephemeral disk,
   so use at least the smallest paid instance with a disk for production.
6. Note the public URL Render gives you — this becomes `PDF_SERVICE_URL` in
   the Next.js app's environment.

### Option B — Railway / Fly.io

Equivalent steps: point the service at `/pdf-service`, set the start command
above, attach a persistent volume for `/storage`, and note the public URL.

### Recommended production hardening (not included by default)

- Put the pdf-service behind a private network / IP allowlist so only the
  Next.js app can reach it (it should never be called directly by browsers).
- Swap local-disk thumbnail/upload storage for a shared object store
  (Supabase Storage bucket `printready-uploads` is already created by the
  migration, or any S3-compatible bucket) if you run multiple instances of
  either service.

## 3. Deploy the Next.js app (Vercel)

1. Import the repository into Vercel, with the **root directory set to the
   repository root** (not `/pdf-service`).
2. Add environment variables (Project Settings → Environment Variables):
   - `AUTH_SECRET` — generate with `openssl rand -hex 32`
   - `PDF_SERVICE_URL` — the URL from step 2
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — from step 1
   - `NEXT_PUBLIC_APP_URL` — your production domain, e.g. `https://printready.app`
   - `CRON_SECRET` — any random string, used to protect the cleanup endpoint
3. Deploy. Vercel will automatically pick up `vercel.json`, which schedules
   the temp-file cleanup job (`/api/cron/cleanup`) hourly.
4. Point your domain's DNS at Vercel (Project Settings → Domains).

> **Note on local/shared storage:** this reference implementation shares a
> filesystem directory between the Next.js app and the Python service for
> thumbnails. On Vercel (serverless, no persistent local disk), the
> file-serving routes (`/api/files/*`) will not be able to read files the
> pdf-service wrote to *its own* disk. For a Vercel + externally-hosted
> pdf-service deployment, update `PRINTREADY_STORAGE_DIR` handling in
> `lib/pdf/service.ts` and the `/api/files/*` routes to read from the shared
> object store (Supabase Storage) instead of local disk. This is clearly
> isolated to a handful of files and is the main integration task for a
> fully serverless production deployment.

## 4. First-run checklist

- [ ] Visit your production URL — the landing page and interactive demo
      should work immediately (the demo endpoint doesn't require Supabase).
- [ ] Register a real account and confirm login/logout work.
- [ ] Run an inspection end-to-end and download the PDF report.
- [ ] In Supabase, manually set `is_admin = true` on your profile row to
      access `/dashboard/admin`.
- [ ] Remove or protect the demo accounts seeded by the local adapter (they
      only exist in local/demo mode — once Supabase is configured, there are
      no seeded accounts, so create your own).
- [ ] Remove `/api/dev/set-plan` (or leave it — it only changes the calling
      user's own plan with no financial effect) once real billing is wired.

## 5. Estimated monthly hosting costs (at launch / low volume)

| Service | Tier | Est. cost |
|---|---|---|
| Vercel (Next.js app) | Hobby/Pro | $0–$20/mo |
| Render/Railway (pdf-service + disk) | Starter | $7–$15/mo |
| Supabase (Postgres + Auth + Storage) | Free tier (up to 500MB DB, 1GB storage) → Pro | $0–$25/mo |
| Domain | — | ~$12/yr |
| **Total** | | **~$10–$60/mo** depending on tier choices |

This is intentionally a low-overhead stack — there is no component here that
requires enterprise infrastructure to operate at a small-to-medium scale.

## 6. Scaling notes

- The in-memory rate limiter (`src/lib/rate-limit.ts`) is per-instance. If
  you scale the Next.js app horizontally, swap it for a shared store
  (Upstash Redis is a drop-in, low-cost option).
- The pdf-service is stateless aside from the shared storage directory, so
  it can be scaled horizontally once storage is moved to an object store.
