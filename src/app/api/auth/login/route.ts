import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { createSessionCookie } from "@/lib/auth/session";
import { rateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const key = clientKeyFromHeaders(req.headers, "login");
  if (!rateLimit(key, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const { user, error } = await db.authenticate(email, password);
  if (error || !user) {
    return NextResponse.json({ error: error || "Invalid email or password." }, { status: 401 });
  }

  await createSessionCookie(user);
  return NextResponse.json({ user });
}
