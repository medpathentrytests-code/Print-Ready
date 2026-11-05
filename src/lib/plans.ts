// Centralized, configurable subscription plan definitions.
// This is the single source of truth for monetisation limits AND real
// billing pricing. Live payment processing is handled by Freemius (a
// merchant-of-record that supports worldwide card payments, tax/VAT, and
// subscription renewals) — see lib/billing/freemius.ts.
//
// Freemius is optional and feature-flagged by the presence of its
// environment variables (see .env.example). If it isn't configured, the app
// falls back to the original no-payment demo/evaluation mode (instant plan
// switching in Settings) so it stays freely testable.

export type PlanId = "free" | "pro" | "business";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  inspectionsPerMonth: number | null; // null = unlimited
  maxFileSizeMb: number;
  maxPagesPerDocument: number;
  projectHistoryLimit: number | null;
  features: string[];
  // Name of the env var holding this plan's Freemius Plan ID (set once the
  // plan has been created in the Freemius Developer Dashboard).
  freemiusPlanIdEnvVar?: "FREEMIUS_PRO_PLAN_ID" | "FREEMIUS_BUSINESS_PLAN_ID";
  highlighted?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    inspectionsPerMonth: 2,
    maxFileSizeMb: 25,
    maxPagesPerDocument: 60,
    projectHistoryLimit: 3,
    features: [
      "2 inspections / month",
      "All 10 quality checks",
      "Downloadable PDF report",
      "7-day inspection history",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 9,
    inspectionsPerMonth: 50,
    maxFileSizeMb: 75,
    maxPagesPerDocument: 400,
    projectHistoryLimit: null,
    features: [
      "50 inspections / month",
      "All 10 quality checks",
      "Unlimited project history",
      "Compare report versions",
      "Priority processing",
    ],
    freemiusPlanIdEnvVar: "FREEMIUS_PRO_PLAN_ID",
    highlighted: true,
  },
  business: {
    id: "business",
    name: "Business",
    priceMonthlyUsd: 19,
    inspectionsPerMonth: null,
    maxFileSizeMb: 150,
    maxPagesPerDocument: 1500,
    projectHistoryLimit: null,
    features: [
      "Unlimited inspections",
      "All 10 quality checks",
      "Unlimited project history",
      "Team-ready architecture",
      "Priority processing",
      "Admin usage dashboard",
    ],
    freemiusPlanIdEnvVar: "FREEMIUS_BUSINESS_PLAN_ID",
  },
};

export function getPlan(id: string | null | undefined): PlanDefinition {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.free;
}

// Returns the start of the current monthly usage window (calendar month, UTC).
export function currentUsagePeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// --- Billing provider availability (checked at runtime, server-side only) ---
// NOTE: deliberately only checks env vars (no SDK import) so this stays
// lightweight enough to call from server components / layout code without
// pulling the Freemius SDK into every bundle that touches plans.ts.

export function isFreemiusConfigured(): boolean {
  return Boolean(
    process.env.FREEMIUS_PRODUCT_ID &&
    process.env.FREEMIUS_PUBLIC_KEY &&
    process.env.FREEMIUS_API_KEY &&
    process.env.FREEMIUS_SECRET_KEY
  );
}

export function isLiveBillingEnabled(): boolean {
  return isFreemiusConfigured();
}
