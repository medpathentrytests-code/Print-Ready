import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isFreemiusConfigured, isFreemiusSandbox } from "@/lib/billing/freemius";
import { PLANS } from "@/lib/plans";

// Hands the client just enough public, non-secret info to open the Freemius
// Checkout overlay itself: the product ID + public key (both meant to be
// public — see Freemius docs) and the Plan IDs for Pro/Business (also not
// secret; they just identify which plan to pre-select). The API Key and
// Secret Key never leave the server — see lib/billing/freemius.ts.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isFreemiusConfigured()) {
    return NextResponse.json({ error: "Freemius is not configured on this server yet." }, { status: 503 });
  }

  const proPlanId = process.env.FREEMIUS_PRO_PLAN_ID || null;
  const businessPlanId = process.env.FREEMIUS_BUSINESS_PLAN_ID || null;

  return NextResponse.json({
    productId: process.env.FREEMIUS_PRODUCT_ID,
    publicKey: process.env.FREEMIUS_PUBLIC_KEY,
    sandbox: isFreemiusSandbox(),
    planIds: {
      pro: proPlanId,
      business: businessPlanId,
    },
    // Lets the UI disable a Buy button if that specific plan hasn't been
    // created in the Freemius dashboard yet, without a confusing failure
    // once the overlay opens.
    plansReady: {
      pro: Boolean(proPlanId),
      business: Boolean(businessPlanId),
    },
    userEmail: user.email,
    planNames: Object.fromEntries(Object.values(PLANS).map((p) => [p.id, p.name])),
  });
}
