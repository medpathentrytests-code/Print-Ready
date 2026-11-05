# PrintReady — Administrator Guide

## Accessing the admin dashboard

1. Log in with an account that has `is_admin = true`.
   - **Demo mode (local SQLite):** the seeded account `admin@printready.demo`
     / `PrintReadyAdmin!2026` is an admin by default.
   - **Production (Supabase):** no account is an admin by default. Promote
     one manually:
     ```sql
     update public.profiles set is_admin = true where email = 'you@yourdomain.com';
     ```
2. Visit `/dashboard/admin`. Non-admin accounts see a clear "Admin access
   required" message instead of any data.

## What the dashboard shows

- **Registered users** — total account count.
- **Total inspections** — all-time count across all users.
- **Processing failures** — count of PDF-service errors recorded via
  `db.recordProcessingFailure()` (triggered automatically on upload/analyze
  failures). A non-zero, growing count usually means the PDF service is down,
  misconfigured (`PDF_SERVICE_URL`), or receiving malformed files.
- **Storage used** — sum of uploaded file sizes recorded against inspections
  (approximation of processing footprint; actual disk usage also includes
  thumbnails).
- **Inspections — last 14 days** — a daily volume chart, useful for spotting
  usage trends or sudden drop-offs (which often indicate an outage).
- **System health** — a live check of the PDF processing service (`/health`)
  and which data backend is active (local SQLite vs. Supabase).
- **Subscription configuration** — a read-only view of the plan limits
  defined in `src/lib/plans.ts`, with a live count of users on each plan.
- **Recent users / recent inspections** — the newest activity, for a quick
  sanity check that the product is working end-to-end.

## Common admin tasks

| Task | How |
|---|---|
| Promote a user to admin | Run the SQL above (Supabase) or update the `users` table directly (local SQLite, `data/printready.db`) |
| Change a user's plan | `update profiles set plan = 'pro' where email = '...'` (Supabase) or the equivalent SQLite update. There is no self-service admin UI for this yet — see Roadmap. |
| Investigate a processing failure | Check the PDF service logs (`uvicorn` output) around the failure timestamp; the `processing_failures` table only stores a short reason string by design (to avoid storing sensitive file content). |
| Clear stuck temp files | `POST /cleanup` on the PDF service directly, or trigger `/api/cron/cleanup` manually. |

## Security

The admin dashboard and its two API routes (`/api/admin/stats`,
`/api/admin/users`) check `user.isAdmin` on every request — there is no
client-side-only gate. A non-admin calling these APIs directly receives
`403 Forbidden`.
