import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmResetSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = confirmResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }
  const { token, password } = parsed.data;
  const result = await db.resetPassword(token, password);
  if (!result.ok) return NextResponse.json({ error: result.error || "Reset failed." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
