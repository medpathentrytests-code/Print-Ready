import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isLiveBillingEnabled } from "@/lib/plans";

// Demo-only, self-service plan switch so the product can be fully evaluated
// without a payment processor. This does NOT charge or simulate any payment.
//
// IMPORTANT: once Freemius is configured via environment variables, this
// endpoint is disabled entirely — otherwise it would be a free bypass around
// actual billing. See /api/billing/freemius/config and the Checkout overlay
// wired up in BillingPanel.tsx for the real upgrade flow.
export async function POST(req: NextRequest) {
  if (isLiveBillingEnabled()) {
    return NextResponse.json(
      { error: "Demo plan switching is disabled because live billing is configured. Upgrade via the Plan panel in Settings & Billing." },
      { status: 403 }
    );
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  if (!["free", "pro", "business"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  await db.setUserPlan(user.id, plan);
  return NextResponse.json({ ok: true });
}
