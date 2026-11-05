"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your free account" subtitle="2 inspections per month, no credit card required.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-[var(--color-ink)]">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]" placeholder="Jane Doe" />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--color-ink)]">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]" placeholder="you@example.com" />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--color-ink)]">Password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]" placeholder="At least 8 characters" />
        </div>
        {error && <p className="text-sm font-medium text-[var(--color-critical)]">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Already have an account? <Link href="/login" className="font-semibold text-[var(--color-brand-violet)]">Log in</Link>
      </p>
    </AuthLayout>
  );
}
