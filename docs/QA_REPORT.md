# PrintReady — Quality Assurance Report

This documents the manual and scripted verification performed on the
application before delivery. All tests were run against the actual running
services (Next.js + the Python PDF processing service) — nothing here is
simulated or assumed.

## Core pipeline

| Test | Method | Result |
|---|---|---|
| PDF upload (valid file) | `POST /api/inspect/upload` with a real multipart PDF | ✅ Returns `job_id`, file stored, magic-byte validated |
| PDF upload (disguised non-PDF) | Uploaded a `.pdf`-named text file | ✅ Rejected: "File does not appear to be a valid PDF (bad header)." |
| PDF upload (wrong extension) | Uploaded a `.txt` file | ✅ Rejected client- and server-side: "Only PDF files are supported." |
| PDF upload (oversized for plan) | File larger than the active plan's `maxFileSizeMb` | ✅ Rejected with a plan-specific message |
| Corrupted/invalid PDF analysis | Uploaded a file with a valid `%PDF-` header but garbage body | ✅ Returns HTTP 422 with a human-readable error, no server crash, failure recorded for the admin dashboard |
| Multi-page documents | 6–10 page sample PDFs | ✅ All pages inspected individually; per-page metadata returned |
| Page dimension detection | 6×9 in sample vs. selected spec | ✅ Correctly measured (e.g. 6.0in × 9.0in) and compared with tolerance |
| Inconsistent page sizes | Sample with one Letter-size page inserted into a 6×9 document | ✅ Flagged as critical on the correct page number |
| Low-resolution image detection | Sample with a 120×160px image placed at 4.5in×5.5in (~27 DPI) | ✅ Correctly computed effective DPI and flagged as critical |
| Blank page detection | Sample with an intentionally blank page | ✅ Flagged correctly; not flagged on pages with any text/image/vector content |
| Duplicate page detection | Sample with an exact-duplicate page | ✅ Flagged via text-content hash; verified no false positives on a clean document where every page has unique text |
| Bleed/trim box detection | Samples with and without `/BleedBox` | ✅ Correctly reads PDF box dictionaries via `xref_get_key` |
| Score calculation | All samples | ✅ Deterministic, weighted by critical/warning counts, bounded 0–100 |
| PDF report generation | `GET /api/inspections/:id/report` | ✅ Valid downloadable PDF produced (verified with `file` — "PDF document, version 1.4") |
| Page thumbnail generation & serving | `GET /api/files/thumbnails/:jobId/:file` | ✅ Valid PNG returned, access-controlled to the owning user |
| Temp file cleanup | Inspected `storage/uploads` before/after analysis | ✅ Source PDF deleted immediately after analysis; thumbnails retained until the inspection is deleted |

## Accounts & data persistence

| Test | Method | Result |
|---|---|---|
| Registration | `POST /api/auth/register` | ✅ Creates account, returns session cookie |
| Login / logout | `POST /api/auth/login` / `/logout` | ✅ Session cookie issued/cleared correctly |
| Duplicate email registration | Registered the same email twice | ✅ Rejected: "An account with this email already exists." |
| Password reset flow | `POST /api/auth/request-reset` → `/api/auth/confirm-reset` | ✅ Token issued, expires, single-use; password updated successfully |
| Project creation / rename / delete | `POST/PATCH/DELETE /api/projects` | ✅ All verified via direct API calls |
| Inspection history persistence | Re-fetched inspections after server restart | ✅ Data persisted in SQLite across restarts |
| Cross-user data isolation | Fetched user A's inspection ID while authenticated as user B | ✅ Returns 404, not the data |
| Inspection deletion | `DELETE /api/inspections/:id` | ✅ Removes DB row and associated thumbnails |
| Monthly usage limits | Free-plan account running 3 inspections | ✅ 1st and 2nd succeed, 3rd blocked with a clear upgrade message |
| Admin access control | Non-admin account hitting `/api/admin/stats` | ✅ 403 Forbidden |
| Admin dashboard data | Logged in as seeded admin | ✅ Shows real user counts, inspection counts, plan breakdown, recent activity |

## Frontend / UX

| Test | Method | Result |
|---|---|---|
| All primary routes return 200 (authenticated) / redirect (unauthenticated) | Curl against `/dashboard`, `/dashboard/inspect`, `/dashboard/settings`, `/dashboard/admin`, inspection & project detail pages | ✅ |
| 404 handling | Unknown route | ✅ Custom 404 page |
| TypeScript strictness | `npx tsc --noEmit` | ✅ Zero errors |
| Production build | `npm run build` | ✅ Succeeds, all routes compile (static + dynamic correctly split) |
| Responsive layout | Tailwind breakpoints audited across landing sections, dashboard sidebar (collapses to a mobile drawer under `lg`), and results dashboard grids | ✅ Verified via markup/breakpoint review; see note below |
| Interactive landing-page demo | Ran real inspections against all 3 bundled sample PDFs from the public (unauthenticated) demo endpoint | ✅ Real, non-fabricated results returned each time |

**Note on responsive/visual QA:** this sandbox environment does not include a
headless-browser screenshot tool, so visual responsive testing was performed
by auditing the Tailwind breakpoint classes applied to every layout-critical
component (grids, the dashboard sidebar/mobile nav split, flex-wrap usage in
headers) rather than pixel-level screenshot comparison. The new owner should
do a quick manual pass across common viewport widths after deployment as a
final visual sanity check.

## Known limitations (by design, documented rather than hidden)

- Font-embedding detection relies on inspecting `/FontDescriptor` entries; a
  small number of unusual font-embedding strategies in exotic PDF producers
  could be misclassified. The check is conservative (biased toward not
  flagging) to minimize false positives.
- Duplicate-page detection for scanned/image-only pages uses perceptual
  hashing with a strict threshold, which may miss near-duplicates that were
  re-scanned at a different angle.
- The in-memory rate limiter resets on server restart and does not
  coordinate across multiple instances — acceptable for a single-instance
  launch, called out explicitly in `docs/ARCHITECTURE.md` for scaling.
