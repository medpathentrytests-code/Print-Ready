"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";

function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/confirm-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed.");
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-[var(--color-critical)]">Missing or invalid reset token. Please request a new reset link.</p>;
  }

  if (done) {
    return <p className="text-sm font-medium text-[var(--color-success)]">Password updated! Redirecting you to login…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-[var(--color-ink)]">New password</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]" placeholder="At least 8 characters" />
      </div>
      {error && <p className="text-sm font-medium text-[var(--color-critical)]">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? <Loader2 size={16} className="animate-spin" /> : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetConfirmPage() {
  return (
    <AuthLayout title="Choose a new password" subtitle="Enter a new password for your account.">
      <Suspense>
        <ConfirmForm />
      </Suspense>
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        <Link href="/login" className="font-semibold text-[var(--color-brand-violet)]">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
