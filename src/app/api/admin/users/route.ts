import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await db.listAllUsers();
  return NextResponse.json({ users });
}
