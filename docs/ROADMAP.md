# PrintReady — Future Development Roadmap

Suggested next steps for a new owner, roughly in priority order.

## Near-term (launch readiness)

- [x] Live billing via Freemius is already wired end-to-end (checkout,
      server-side purchase verification, webhooks, self-serve cancellation) —
      see `docs/BILLING_SETUP.md`. It replaces the demo-only plan switcher
      (`/api/dev/set-plan`) automatically the moment it's configured; see
      `docs/ARCHITECTURE.md` § 8.
- [ ] Configure custom SMTP in Supabase Auth so password-reset / confirmation
      emails arrive from your own domain.
- [ ] Replace the placeholder Terms of Service / Privacy Policy
      (`src/app/legal/*`) with counsel-reviewed versions.
- [ ] Move shared storage (uploads/thumbnails) from local disk to Supabase
      Storage or S3 if deploying the two services on different hosts without
      a shared filesystem (see `docs/DEPLOYMENT.md`).
- [ ] Decide on the PyMuPDF licensing question (AGPL vs. commercial) before
      a closed-source commercial launch — see `docs/THIRD_PARTY_DEPENDENCIES.md`.

## Product improvements

- [ ] Batch inspection: upload a cover + interior together and cross-check
      spine width against page count.
- [ ] Export reports as CSV/JSON in addition to PDF, for studios tracking
      QA across many titles.
- [ ] Team/workspace accounts (shared projects across multiple users) —
      the `projects` table already supports a straightforward extension to
      a `team_id` foreign key.
- [ ] Printer-specific profiles (e.g. a curated set of known specifications
      for popular POD services) layered on top of the existing generic trim
      sizes — without ever claiming official certification.
- [ ] Inline PDF viewer with issue markers overlaid directly on the page
      thumbnail (currently issues reference page numbers; visually pinning
      them to exact coordinates — already computed internally for margin
      checks — would be a natural enhancement).
- [ ] Webhooks / email notification when an inspection completes
      (useful once processing time grows with larger documents).

## Scaling

- [ ] Swap the in-memory rate limiter for Upstash Redis (or similar) once
      running more than one Next.js instance.
- [ ] Move PDF analysis to a queue (e.g. a simple job table + worker) if
      inspection volume grows enough that synchronous request/response
      analysis becomes slow for large documents.
- [ ] Add structured logging / error monitoring (Sentry or similar) — none
      is included today beyond the `processing_failures` table and console
      output.

## Nice-to-haves

- [ ] Dark mode (the design system's CSS variables already make this a
      relatively mechanical change).
- [ ] Public API for programmatic inspection (e.g. for publishing platforms
      wanting to embed a "check my file" step in their own upload flow).
