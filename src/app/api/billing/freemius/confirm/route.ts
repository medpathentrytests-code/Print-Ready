import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFreemius, FreemiusError } from "@/lib/billing/freemius";
import { PLANS } from "@/lib/plans";

// Called by the client immediately after the Freemius Checkout overlay's
// `purchaseCompleted` callback fires. We never trust the client-side payload
// to activate billing — instead we take the license ID it handed us and look
// the purchase up ourselves, server-side, using our secret-key-authenticated
// Freemius SDK instance. Only if that independent lookup confirms a real,
// active purchase for the logged-in user's email do we activate the plan.
// This mirrors the same server-side-verify-before-activate approach used by
// the old PayPal integration.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const licenseId = body?.licenseId;
  const rawPlan = body?.plan;
  if (!licenseId || typeof licenseId !== "string") {
    return NextResponse.json({ error: "Missing licenseId." }, { status: 400 });
  }
  if (rawPlan !== "pro" && rawPlan !== "business") {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  const requestedPlan: "pro" | "business" = rawPlan;

  let freemius;
  try {
    freemius = getFreemius();
  } catch (err) {
    if (err instanceof FreemiusError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let purchase;
  try {
    purchase = await freemius.purchase.retrievePurchaseData(licenseId);
  } catch {
    return NextResponse.json({ error: "Could not reach Freemius to verify the purchase. Please try again." }, { status: 502 });
  }

  if (!purchase) {
    return NextResponse.json({ error: "No purchase found for that license." }, { status: 404 });
  }
  if (purchase.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "This purchase is registered to a different email address." }, { status: 403 });
  }

  const planDef = PLANS[requestedPlan];
  const expectedPlanId = planDef.freemiusPlanIdEnvVar ? process.env[planDef.freemiusPlanIdEnvVar] : undefined;
  if (expectedPlanId && String(purchase.planId) !== String(expectedPlanId)) {
    return NextResponse.json({ error: "The purchased plan does not match the requested plan." }, { status: 400 });
  }

  await db.activateSubscription(user.id, {
    provider: "freemius",
    providerRef: purchase.licenseId,
    plan: requestedPlan,
    expiresAt: purchase.expiration ? new Date(purchase.expiration).toISOString() : null,
  });

  const existing = await db.getPaymentByRef(purchase.licenseId);
  if (!existing) {
    await db.recordPayment({
      userId: user.id,
      provider: "freemius",
      providerRef: purchase.licenseId,
      plan: requestedPlan,
      amount: purchase.initialAmount ?? planDef.priceMonthlyUsd,
      currency: "USD",
      status: "completed",
    });
  }

  return NextResponse.json({ ok: true, plan: requestedPlan });
}
