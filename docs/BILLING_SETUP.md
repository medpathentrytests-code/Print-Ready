# Billing Setup — Freemius

PrintReady ships with a real payment integration wired end-to-end against
[Freemius](https://freemius.com) — a merchant-of-record that handles
worldwide card processing, tax/VAT, invoicing, and subscription renewals for
you. It's optional and feature-flagged purely by the presence of environment
variables — with none configured, the app stays in its original no-payment
demo/evaluation mode (instant plan switching in Settings).

**Nothing charges real money until you deliberately configure these.**

---

## 1. Create a Product for PrintReady

Freemius organizes everything (plans, pricing, checkout branding) under a
**Product**. If you already have a Freemius account for something else
(another app, a plugin, a different website), **create a new, separate
Product for PrintReady rather than reusing an existing one** — plans and
checkout branding are per-product, so reusing an unrelated product would
show the wrong name/branding at checkout and change that other product's
pricing instead of PrintReady's.

1. Log into the [Freemius Developer Dashboard](https://dashboard.freemius.com).
2. Click **+ Add Product** (top right) → choose **SaaS** as the product type.
3. Name it `PrintReady` (or your chosen product name) and complete the basic
   product setup (description, icon — these can be edited later).

## 2. Create the Pro and Business plans

Inside your new PrintReady product → **Plans** in the left sidebar:

1. Click **+ Add Plan** (or **Create New** on the first-plan screen).
   - **Title**: `Pro` · **Unique name**: `pro`
   - Click **Create New**, then set its price to **$9/mo** (USD, monthly).
2. Repeat for the second plan:
   - **Title**: `Business` · **Unique name**: `business`
   - Price: **$19/mo** (USD, monthly).
3. Open each plan's detail page and copy its **Plan ID** (a numeric ID shown
   in the plan's URL / details) — you'll need both for `.env.local`.

(Free is handled entirely by PrintReady itself — there's no need to create a
"Free" plan in Freemius.)

## 3. Find your Product ID and Public Key

Still inside the PrintReady product → **Integrations** (or the product's
**Overview**/**Edit Product** page) — this page shows:
- **Product ID** — a numeric ID identifying this specific product.
- **Public Key** — safe to expose client-side; used to open the Checkout
  overlay in the browser.

## 4. Find your API Key and Secret Key

These are **account-level** (not per-product), used server-side only:

1. Click your account avatar (top right) → **API Keys** (sometimes listed
   under account/developer settings).
2. Generate or copy your **API Key** and **Secret Key**.

⚠️ The Secret Key must never be exposed to the browser or committed to
source control — it only ever belongs in server-side environment variables.

## 5. Configure the app

Add to `.env.local` (or your hosting provider's environment variables):

```
FREEMIUS_PRODUCT_ID=...
FREEMIUS_PUBLIC_KEY=...
FREEMIUS_API_KEY=...
FREEMIUS_SECRET_KEY=...
FREEMIUS_PRO_PLAN_ID=...
FREEMIUS_BUSINESS_PLAN_ID=...
# FREEMIUS_MODE=sandbox   # uncomment to test without real charges
```

Restart the app. The real "Upgrade with Freemius" buttons now appear in
**Settings & Billing**, and the Free plan's 2-inspection/month limit now
leads to a real checkout instead of a dead end.

## 6. Register the webhook (do this once you have a stable deployed domain)

This keeps renewals/cancellations in sync even when a user never returns to
the app after checkout:

1. Deploy the app (Vercel, etc).
2. In the Freemius Dashboard → your product → **Integrations → Webhooks**,
   add: `https://yourdomain.com/api/billing/freemius/webhook`.
3. No further config needed — the webhook route verifies every request's
   signature against `FREEMIUS_SECRET_KEY` before acting on it.

---

## How it works

- User clicks **Upgrade with Freemius** → the Freemius Checkout overlay
  (`@freemius/checkout`) opens directly in the browser for the selected plan.
- On success, the client posts the returned license ID to
  `POST /api/billing/freemius/confirm`, which independently re-verifies the
  purchase server-side (via the secret-key-authenticated SDK — never trusting
  the client payload) before activating the plan and recording the payment.
- `POST /api/billing/freemius/webhook` keeps license/subscription state in
  sync going forward (renewals, cancellations, expirations).
- `GET/POST /api/billing/freemius/portal` powers the "Cancel subscription"
  control in Settings & Billing — it reads the user's current Freemius
  subscription and lets them cancel renewal without leaving the app.

## What changes once billing is live

- The demo-only `/api/dev/set-plan` instant-upgrade endpoint **disables
  itself automatically** the moment Freemius is configured — it would
  otherwise be a free bypass around real billing.
- Settings & Billing replaces the demo plan switcher with the real Freemius
  Checkout flow.
- The admin dashboard's **Revenue (lifetime)** figure and **Recent Payments**
  table reflect real, completed charges only — never fabricated, never an
  estimate. It reads $0 until a real payment completes.
- Users can cancel anytime from Settings & Billing — this calls Freemius's
  own Customer Portal cancellation action, so no further renewal charges
  occur, not just a local flag flip.
