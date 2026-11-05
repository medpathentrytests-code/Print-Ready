# PrintReady — Business Overview

## What it is

PrintReady is a micro-SaaS that lets self-publishers and print-on-demand
creators upload a PDF and get an automated preflight inspection — page
dimensions, image resolution, bleed/margins, font embedding, blank/duplicate
pages, structural integrity, and color-space warnings — before they send a
file to print or upload it to a publishing platform.

## Target customer

- Independent authors self-publishing books (novels, workbooks, journals,
  children's books) through print-on-demand services.
- Small design studios producing print-ready files for clients.
- Anyone who has been burned once by a rejected or poorly-printed file and
  wants a second pair of (automated) eyes before committing to a print run.

## Why this is a reasonable micro-SaaS

- **Narrow, well-defined problem.** "Will my PDF print correctly" is a
  specific, recurring pain point with objectively measurable sub-problems
  (DPI, dimensions, bleed) — not a vague aspiration. That makes the product
  easy to explain and easy to trust once it demonstrably works.
- **Low infrastructure cost.** No GPU inference, no expensive third-party
  APIs — the entire analysis engine runs on commodity CPU using open-source
  libraries (see `docs/THIRD_PARTY_DEPENDENCIES.md`). Estimated hosting cost
  at launch is roughly $10–$60/month (see `docs/DEPLOYMENT.md` § 5).
- **Clear monetisation path.** Usage naturally scales with how often someone
  is actively publishing — a monthly inspection cap is an intuitive, fair
  metering unit (see Pricing below).
- **Low support burden.** The product's output is self-explanatory (a score,
  a list of issues, and a fix for each one), reducing the need for
  hand-holding support.

## Pricing (live billing wired via Freemius)

| Plan | Price (USD) | Inspections/mo | Notes |
|---|---|---|---|
| Free | $0 | 2 | Onboarding / trial tier |
| Pro | $9/mo | 50 | Target tier for active self-publishers |
| Business | $19/mo | Unlimited | Studios / high-volume users |

Defined centrally in `src/lib/plans.ts`. Billing runs through
[Freemius](https://freemius.com), a merchant-of-record that handles worldwide
card payments, tax/VAT, invoicing, and renewals — a real, working integration
(not scaffolding), gated behind a handful of environment variables. Full
setup instructions and exactly where to find each credential in the Freemius
dashboard: **`docs/BILLING_SETUP.md`**. With it not configured, the product
runs in its original no-payment demo/evaluation mode.

## What this product does NOT claim

This is stated explicitly, in the app itself and here, because overclaiming
would be both dishonest and a liability for a buyer:

- PrintReady is **not affiliated with, endorsed by, or certified by Amazon
  KDP, IngramSpark, or any specific print platform**. It does not guarantee
  a file will be accepted anywhere.
- It does not fabricate analysis results, testimonials, customer counts, or
  reviews — anywhere in the product, including the marketing site. The
  landing page's interactive demo runs the real analysis engine live.
- Some checks are necessarily heuristic (e.g. "possible duplicate page",
  "possibly unembedded font") rather than absolute — the UI distinguishes
  confirmed structural errors (critical) from heuristic warnings, and every
  issue states its page number and reasoning so a human can verify it.

## Competitive landscape (brief)

Preflight tools exist in professional prepress software (Adobe Acrobat Pro's
Preflight, PitStop, callas pdfToolbox) but are expensive, desktop-bound, and
built for print professionals — not indie self-publishers who just want a
plain-English "is my book file okay?" answer in a browser. PrintReady's
niche is that accessibility: a narrow, well-executed, self-serve web tool
for a non-technical audience.

## Roadmap

See `docs/ROADMAP.md` for suggested next steps a new owner could pursue.
