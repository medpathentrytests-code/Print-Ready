// Minimal in-memory sliding-window rate limiter.
//
// Suitable for a single-instance deployment (e.g. one Vercel/Node server).
// For a multi-instance production deployment, swap the `hits` Map for a
// shared store (Upstash Redis, Supabase Postgres table, etc.) — the function
// signature below would stay identical.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return { ok: false, remaining: 0 };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true, remaining: limit - arr.length };
}

export function clientKeyFromHeaders(headers: Headers, suffix: string): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${ip}:${suffix}`;
}
