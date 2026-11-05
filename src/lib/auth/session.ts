// Lightweight session layer shared by both data adapters.
//
// PrintReady issues its own short-lived, signed JWT session cookie after a
// successful sign-in (whether the credentials were verified by the local
// adapter or by Supabase Auth). This keeps the rest of the app — route
// handlers, server components — completely agnostic to which backend
// verified the password, while still being a real, tamper-proof session
// (HMAC-SHA256 via `jose`, httpOnly + secure cookie, short expiry).
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "../db";
import type { AppUser } from "../db/types";

const COOKIE_NAME = "printready_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-in-production";
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(user: AppUser) {
  const token = await new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    const user = await db.getUserById(payload.sub as string);
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
