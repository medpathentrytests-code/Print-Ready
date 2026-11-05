import { NextRequest, NextResponse } from "next/server";
import { db, isDemoMode } from "@/lib/db";
import { requestResetSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const key = clientKeyFromHeaders(req.headers, "reset-request");
  if (!rateLimit(key, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }

  const { resetLink, error } = await db.requestPasswordReset(parsed.data.email);
  if (error) return NextResponse.json({ error }, { status: 400 });

  // In production (Supabase adapter) the reset email is sent directly by
  // Supabase Auth and no link is returned here. In local demo mode there is
  // no email provider configured, so — purely for testability — we return
  // the link directly, clearly labelled as a demo-mode affordance.
  return NextResponse.json({
    ok: true,
    message: "If an account exists with that email, a reset link has been sent.",
    demoResetLink: isDemoMode ? resetLink : undefined,
  });
}
