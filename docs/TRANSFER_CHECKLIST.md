# PrintReady — Ownership Transfer Checklist

Use this checklist when handing PrintReady over to a new owner (e.g. via a
SideProjectors sale).

## Code & repository

- [ ] Transfer the Git repository (GitHub/GitLab) to the buyer's account, or
      provide a full clone/export if hosted elsewhere.
- [ ] Confirm `.env.local` and any real secrets are **excluded** from the
      transferred repository (`.gitignore` already covers `.env*`,
      `node_modules`, `data/`, and `storage/`) — share credentials
      separately and securely, not via the repo.
- [ ] Walk the buyer through `docs/ARCHITECTURE.md` and `docs/DEPLOYMENT.md`.

## Infrastructure accounts

- [ ] Create a **new** Supabase project under the buyer's own account (do
      not transfer your personal Supabase account) and run
      `supabase/migrations/0001_init.sql` against it.
- [ ] Create a **new** Vercel (or alternative host) project under the
      buyer's account.
- [ ] Create a **new** Render/Railway/Fly.io account (or project) for the
      PDF processing service under the buyer's account.
- [ ] Generate fresh values for `AUTH_SECRET` and `CRON_SECRET` — do not
      reuse any secret that existed during development/demo.
- [ ] If Freemius billing is connected, it should be the buyer's own
      Freemius account (and their own Product, not shared with any other
      product) from day one.

## Domain & branding

- [ ] Transfer domain registration (or provide DNS access) if a domain was
      purchased as part of the sale.
- [ ] Update `NEXT_PUBLIC_APP_URL` and any hard-coded domain references
      (`src/app/layout.tsx` metadata, `robots.ts`, `sitemap.ts`) to the
      buyer's domain.
- [ ] Hand over the logo source (`src/components/ui/Logo.tsx` is a plain
      inline SVG component — no external design files are required to
      reproduce or modify it) and the favicon (`src/app/icon.svg`).
- [ ] Transfer any social media handles / accounts created for the product,
      if applicable (none are assumed to exist by default — this product
      intentionally does not fabricate a social presence).

## Data

- [ ] If any real user data exists at time of sale, agree with the buyer on
      a data-migration or data-deletion plan consistent with your privacy
      policy and applicable law before transferring access.
- [ ] Rotate/revoke your own access to all accounts (Supabase, Vercel,
      Render, domain registrar, Freemius if connected) once transfer is
      confirmed complete.

## Verification (buyer should confirm before final payment/closing)

- [ ] Can deploy the app independently following `docs/DEPLOYMENT.md` alone.
- [ ] Can register an account, run an inspection, and download a report on
      the newly deployed instance.
- [ ] Can access the admin dashboard with a freshly promoted admin account.
- [ ] Understands the PyMuPDF licensing consideration
      (`docs/THIRD_PARTY_DEPENDENCIES.md`).
- [ ] Has received the demo account credentials and sample PDF files
      (`storage/samples/`) for their own testing/demo purposes.
