import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getFreemius, isFreemiusConfigured } from "@/lib/billing/freemius";

type SyncablePlan = "pro" | "business";

// Freemius calls this endpoint directly (not via the browser) whenever a
// license/subscription changes state, so our DB stays correct even if the
// user never returns to the app after checkout, cancels from Freemius's own
// customer portal, a renewal fails, etc. The SDK verifies the request's HMAC
// signature against our Secret Key before any handler below runs.
// Configure this URL in the Freemius Developer Dashboard under
// Integration > Webhooks: https://<your-domain>/api/billing/freemius/webhook
export async function POST(request: NextRequest) {
  if (!isFreemiusConfigured()) {
    return new Response("Freemius is not configured on this server.", { status: 503 });
  }

  const freemius = getFreemius();
  const listener = freemius.webhook.createListener();

  function planIdFromFreemiusPlan(freemiusPlanId: string | undefined | null): SyncablePlan | null {
    if (!freemiusPlanId) return null;
    if (String(process.env.FREEMIUS_PRO_PLAN_ID) === String(freemiusPlanId)) return "pro";
    if (String(process.env.FREEMIUS_BUSINESS_PLAN_ID) === String(freemiusPlanId)) return "business";
    return null;
  }

  async function syncByEmail(email: string | undefined, licenseId: string, planId: SyncablePlan | null, expiration: string | null) {
    if (!email || !planId) return;
    const user = await db.getUserByBillingRef(licenseId).catch(() => null);
    // Fall back to looking the user up by email if we don't already have
    // this license on file (e.g. the very first activation).
    const target = user ?? (await db.listAllUsers()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!target) return;
    await db.activateSubscription(target.id, {
      provider: "freemius",
      providerRef: licenseId,
      plan: planId,
      expiresAt: expiration ? new Date(expiration).toISOString() : null,
    });
  }

  listener.on("license.created", async (event) => {
    const license = event.objects?.license || undefined;
    const user = event.objects?.user;
    const licenseId = event.data?.license_id;
    const planId = planIdFromFreemiusPlan(license?.plan_id);
    if (licenseId) await syncByEmail(user?.email, licenseId, planId, event.data?.expiration ?? null);
  });

  listener.on("license.extended", async (event) => {
    const license = event.objects?.license || undefined;
    const user = event.objects?.user;
    const licenseId = event.data?.license_id;
    const planId = planIdFromFreemiusPlan(license?.plan_id);
    if (licenseId) await syncByEmail(user?.email, licenseId, planId, event.data?.to ?? null);
  });

  listener.on(["license.cancelled", "license.expired", "subscription.cancelled"], async (event) => {
    const licenseId = event.data?.license_id;
    if (!licenseId) return;
    const user = await db.getUserByBillingRef(licenseId).catch(() => null);
    if (user) await db.cancelSubscription(user.id);
  });

  return freemius.webhook.processFetch(listener, request);
}
