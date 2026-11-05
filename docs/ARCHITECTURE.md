# PrintReady — Technical Architecture

## 1. Overview

PrintReady is a two-service application:

```
┌──────────────────────┐        HTTP (internal, server-to-server)       ┌───────────────────────────┐
│   Next.js app          │ ───────────────────────────────────────────▶ │  Python PDF service          │
│   (TypeScript, App     │                                               │  (FastAPI + PyMuPDF/pypdf/   │
│    Router, Tailwind)   │ ◀─────────────────────────────────────────── │   Pillow/ReportLab)           │
└──────────┬────────────┘           JSON + binary (PDF/PNG)             └───────────────┬───────────┘
           │                                                                            │
           │ reads/writes                                                 reads/writes  │
           ▼                                                                            ▼
┌──────────────────────┐                                               ┌───────────────────────────┐
│ Data adapter           │                                               │ Shared storage directory     │
│  - Local: SQLite       │                                               │  uploads / thumbnails /      │
│  - Prod: Supabase       │                                               │  reports / samples            │
│    (Postgres + Auth)   │                                               └───────────────────────────┘
└──────────────────────┘
```

Why two services instead of one? PDF structural/image analysis (PyMuPDF,
Pillow) is CPU- and memory-bound work best served by a long-running Python
process with native libraries, while the web app, auth, and dashboard are a
natural fit for Next.js. Keeping them separate also means either side can be
scaled, replaced, or redeployed independently — important for a transferable,
maintainable product.

## 2. Frontend (`/src`)

- **Framework:** Next.js 16 (App Router, React Server Components where
  possible, client components only where interactivity is required).
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` configuration in
  `src/app/globals.css` — no `tailwind.config.js` needed). Brand tokens
  (`--color-ink`, `--brand-violet`, severity colors, etc.) are defined once
  and reused everywhere.
- **Structure:**
  - `src/app` — routes (landing page, auth, `/dashboard/*`, `/api/*`).
  - `src/components/ui` — generic primitives (Button, Badge, Logo, Container).
  - `src/components/landing` — marketing page sections.
  - `src/components/dashboard` — authenticated app UI (dropzone, spec
    selector, results dashboard, admin widgets).
  - `src/components/auth` — auth page shell.
  - `src/lib` — framework-agnostic business logic: data adapters, auth
    session handling, plan/billing config, validation schemas, rate limiting,
    PDF-service client, issue grouping helpers.

## 3. Data layer (`src/lib/db`)

PrintReady defines a single `DataAdapter` TypeScript interface
(`src/lib/db/types.ts`) and ships **two implementations**:

| Adapter | File | When it's used |
|---|---|---|
| Local (SQLite) | `local.ts` | Automatically, whenever Supabase env vars are absent. Zero-config — perfect for development, CI, and demos. Seeds a demo admin + creator account on first run. |
| Supabase | `supabase.ts` | Automatically, whenever `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set. Talks to Postgres + Supabase Auth. |

`src/lib/db/index.ts` selects the adapter at runtime — **no other code in the
app imports `local.ts` or `supabase.ts` directly**, so switching from demo
mode to production Supabase is a configuration change, not a code change.

The Supabase schema (tables, indexes, Row Level Security policies, a storage
bucket, and a trigger that creates a `profiles` row for every new
`auth.users` row) lives in `supabase/migrations/0001_init.sql`.

## 4. Authentication

- **Local adapter:** bcrypt-hashed passwords stored in SQLite; this app
  issues its own signed session cookie.
- **Supabase adapter:** Supabase Auth (GoTrue) owns password hashing,
  verification, and password-reset email delivery.
- **Either way**, after a successful login the app issues one unified
  session: a short-lived, `httpOnly`, `HS256`-signed JWT cookie
  (`src/lib/auth/session.ts`), created with the lightweight `jose` library.
  This means every route handler and server component uses the exact same
  `getCurrentUser()` call regardless of which backend verified the password.

## 5. PDF processing engine (`/pdf-service`)

FastAPI app exposing:

| Endpoint | Purpose |
|---|---|
| `POST /upload` | Validates (magic-byte sniff, size cap) and stores a PDF, returns a `job_id`. |
| `POST /analyze` | Runs the full inspection (`analysis/engine.py`) against a previously uploaded `job_id`; generates page thumbnails; deletes the source PDF once done. |
| `POST /report` | Renders the downloadable PDF report (`analysis/report.py`, ReportLab). |
| `DELETE /job/{id}` | Removes thumbnails for a job (called when a user deletes an inspection). |
| `POST /cleanup` | Deletes orphaned uploads older than N hours (for a scheduled job). |
| `GET /health` | Liveness check, surfaced in the admin dashboard. |

### The 10 quality checks (`analysis/engine.py`)

1. **Page dimensions** — compares each page's MediaBox (converted to inches)
   against the selected print specification, with orientation-swap tolerance.
2. **Page size consistency** — flags any page whose size differs from page 1.
3. **Image resolution** — for every placed image, reads true pixel
   dimensions and the exact on-page display size, then computes effective
   DPI — the same calculation a commercial printer uses.
4. **Margins / safe area** — computes the union bounding box of all text,
   vector, and image content per page and flags content inside the
   configured safe margin (or off the page entirely).
5. **Bleed & trim box** — reads the PDF's `/TrimBox` and `/BleedBox`
   dictionary entries directly and verifies the configured bleed amount is
   actually present.
6. **Font embedding** — inspects each font's `/FontDescriptor` for
   `FontFile`/`FontFile2`/`FontFile3` streams to determine if it's embedded.
7. **Blank pages** — a page with no extracted text, no images, and no vector
   drawings is flagged.
8. **Duplicate pages** — primary signal is exact-normalized extracted-text
   matching (low false-positive rate); a tight perceptual-hash fallback
   catches duplicate image-only/scanned pages.
9. **Structure & integrity** — opens the file with both `pypdf` (strict
   cross-reference parsing) and PyMuPDF; catches encryption, corruption, and
   malformed object errors.
10. **Color space & transparency** — flags RGB images (which most print
    vendors convert to CMYK automatically) and pages using PDF transparency
    groups.

Every issue produced carries: category, severity (`critical` / `warning` /
`info`), page number (or `null` for document-level issues), a plain-English
explanation, and a specific recommended fix — see `_issue()` in
`analysis/engine.py`.

**Honesty note:** these are genuinely computed, not simulated. There is no
code path that fabricates a score or issue list — see `docs/BUSINESS_OVERVIEW.md`
§ "What this product does NOT claim" for the limits of automated preflight.

## 6. Storage

A shared directory (`PRINTREADY_STORAGE_DIR`) holds:
`uploads/` (transient, deleted immediately after analysis),
`thumbnails/<job_id>/page-N.png` (kept until the inspection is deleted),
`samples/` (the three bundled sample PDFs used by the landing-page demo and
QA), `reports/` (scratch space only — reports are generated on demand and
streamed, not persisted).

In this reference deployment both services share a filesystem directly. For
a serverless production deployment (e.g. Vercel + a separately hosted
pdf-service), replace the shared directory with Supabase Storage (a bucket
is already defined in the migration) or S3-compatible storage — only
`lib/pdf/service.ts` and the file-serving API routes would need to change.

## 7. Security controls

- Zod validation on every API route's input.
- File-type validation twice (extension/MIME in Next.js, magic-byte sniff in
  the Python service).
- Per-plan file-size and page-count caps, enforced server-side (not just UI).
- A hard safety cap (2,000 pages) independent of plan, to bound worst-case
  processing cost/time.
- In-memory sliding-window rate limiting on auth, upload, analyze, and the
  public demo endpoint (`src/lib/rate-limit.ts` — documented as swappable
  for a shared store in a multi-instance deployment).
- Thumbnails and reports are only ever served to the authenticated owner of
  the inspection (ownership is checked against the database on every
  request, not inferred from the URL).
- Session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- Supabase schema ships Row Level Security policies on every user-data table
  as defense-in-depth.
- Automatic temp-file cleanup (uploaded PDFs are deleted right after
  analysis; an optional scheduled job clears abandoned uploads).

## 8. Billing: Freemius integration

`src/lib/plans.ts` is the single source of truth for plan limits
(inspections/month, max file size, max pages, project history) and pricing.
Every enforcement point (`/api/inspect/upload`, `/api/inspect/analyze`) reads
from this file.

Live billing runs through [Freemius](https://freemius.com) — a
merchant-of-record that handles worldwide card processing, tax/VAT, invoicing,
and subscription renewals, so PrintReady's own code only needs to react to
plan state rather than process payments directly. The integration is
feature-flagged by environment variables (`lib/plans.ts` →
`isFreemiusConfigured()`):

- **`src/lib/billing/freemius.ts`** — lazily-constructed `Freemius` SDK
  (`@freemius/sdk`) singleton from `FREEMIUS_PRODUCT_ID` /
  `FREEMIUS_PUBLIC_KEY` / `FREEMIUS_API_KEY` / `FREEMIUS_SECRET_KEY`.
- **Checkout** — the client (`BillingPanel.tsx`) opens the Freemius Checkout
  overlay (`@freemius/checkout`) directly in the browser for the selected
  plan. On success, `POST /api/billing/freemius/confirm` independently
  re-verifies the purchase server-side (via the secret-key-authenticated SDK,
  never trusting the client payload) before activating the plan.
- **`POST /api/billing/freemius/webhook`** — signed webhook listener that
  keeps renewals/cancellations in sync even if the user never returns to the
  app after checkout.
- **`GET/POST /api/billing/freemius/portal`** — lets a paying user view their
  subscription and self-serve cancel renewal from Settings, backed by the
  SDK's Customer Portal request processor.
- **`GET /api/billing/freemius/config`** — hands the client only the public,
  non-secret config it needs to open Checkout (product ID, public key, plan
  IDs); the API key and secret key never leave the server.

Full setup walkthrough, required credentials, and exactly where to find each
one in the Freemius Developer Dashboard: **`docs/BILLING_SETUP.md`**.

With Freemius not configured, the app stays in its original no-payment
demo/evaluation mode: the demo-only `/api/dev/set-plan` route lets any
logged-in user instantly switch plans to evaluate every tier, with no real
charge. The moment Freemius IS configured, that demo route disables itself
automatically (it would otherwise be a free bypass around real billing) and
Settings & Billing shows the real Freemius Checkout button instead.

All revenue figures surfaced in the admin dashboard (`totalRevenueUsd`,
`recentPayments`) are read directly from the `payments` ledger table, which
is only ever written to after a verified Freemius purchase — never fabricated
or estimated.
