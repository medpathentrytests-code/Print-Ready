// Freemius billing integration (merchant-of-record, worldwide payments).
//
// Replaces the previous hand-rolled PayPal + Easypaisa integrations. Freemius
// handles card processing, tax/VAT, invoicing, and subscription renewals for
// us, so there's far less custom billing logic to maintain here.
//
// All calls to the Freemius API happen server-side only (this module must
// never be imported from a "use client" component) because it requires the
// account-level API Key + Secret Key, which must never reach the browser.
// The client only ever receives the public productId/publicKey pair via
// /api/billing/freemius/config, which is safe to expose (see that route).
//
// Setup: see docs/BILLING_SETUP.md for exactly where to find each of these
// values in the Freemius Developer Dashboard.
import { Freemius } from "@freemius/sdk";

export class FreemiusError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "FreemiusError";
    this.status = status;
  }
}

export function isFreemiusConfigured(): boolean {
  return Boolean(
    process.env.FREEMIUS_PRODUCT_ID &&
    process.env.FREEMIUS_PUBLIC_KEY &&
    process.env.FREEMIUS_API_KEY &&
    process.env.FREEMIUS_SECRET_KEY
  );
}

// Freemius has a real "sandbox" testing mode (separate from live products).
// Default to live unless explicitly opted into sandbox via env var, since an
// owner who has gone through the trouble of configuring real keys almost
// certainly wants real charges — mirrors the old isPayPalConfigured() default.
export function isFreemiusSandbox(): boolean {
  return process.env.FREEMIUS_MODE === "sandbox";
}

let _freemius: Freemius | null = null;

// Throws FreemiusError (not a generic Error) if called while unconfigured so
// API routes can uniformly translate it into a graceful 503 — the app must
// keep working in demo mode when no billing keys are present.
export function getFreemius(): Freemius {
  if (!isFreemiusConfigured()) {
    throw new FreemiusError("Freemius is not configured on this server.", 503);
  }
  if (!_freemius) {
    _freemius = new Freemius({
      productId: process.env.FREEMIUS_PRODUCT_ID!,
      apiKey: process.env.FREEMIUS_API_KEY!,
      secretKey: process.env.FREEMIUS_SECRET_KEY!,
      publicKey: process.env.FREEMIUS_PUBLIC_KEY!,
    });
  }
  return _freemius;
}
