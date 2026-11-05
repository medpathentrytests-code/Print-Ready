"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [demoLink, setDemoLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSent(true);
      setDemoLink(data.demoResetLink || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll send a secure reset link to your email.">
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-[var(--color-success-soft)] p-4 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>If an account exists with that email, a reset link has been sent.</span>
          </div>
          {demoLink && (
            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-alt)] p-4 text-sm">
              <p className="font-semibold text-[var(--color-ink)] mb-1.5">Demo mode notice</p>
              <p className="text-[var(--color-muted)] mb-2">
                No email provider is configured in this sandbox/demo environment. In production (with Supabase connected),
                this link is delivered by email automatically. For now, use this link directly:
              </p>
              <Link href={demoLink} className="font-mono text-xs text-[var(--color-brand-violet)] break-all underline">
                {demoLink}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--color-ink)]">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]" placeholder="you@example.com" />
          </div>
          {error && <p className="text-sm font-medium text-[var(--color-critical)]">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        <Link href="/login" className="font-semibold text-[var(--color-brand-violet)]">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
