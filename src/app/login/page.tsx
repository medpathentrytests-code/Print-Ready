"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Info } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: "admin" | "demo") {
    if (role === "admin") {
      setEmail("admin@printready.demo");
      setPassword("PrintReadyAdmin!2026");
    } else {
      setEmail("demo@printready.demo");
      setPassword("PrintReadyDemo!2026");
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your PrintReady workspace.">
      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-brand-violet-soft)] p-3.5 text-xs text-[var(--color-ink-soft)]">
        <Info size={15} className="mt-0.5 shrink-0 text-[var(--color-brand-violet)]" />
        <div>
          Demo environment — try it instantly:
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={() => fillDemo("demo")} className="rounded-md bg-white px-2 py-1 font-semibold border border-[var(--color-line)] cursor-pointer hover:border-[var(--color-brand-violet)]">Fill creator account</button>
            <button type="button" onClick={() => fillDemo("admin")} className="rounded-md bg-white px-2 py-1 font-semibold border border-[var(--color-line)] cursor-pointer hover:border-[var(--color-brand-violet)]">Fill admin account</button>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-[var(--color-ink)]">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]" placeholder="you@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--color-ink)]">Password</label>
            <Link href="/reset-password" className="text-xs font-semibold text-[var(--color-brand-violet)]">Forgot password?</Link>
          </div>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]" placeholder="••••••••" />
        </div>
        {error && <p className="text-sm font-medium text-[var(--color-critical)]">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        New to PrintReady? <Link href="/register" className="font-semibold text-[var(--color-brand-violet)]">Create a free account</Link>
      </p>
    </AuthLayout>
  );
}
