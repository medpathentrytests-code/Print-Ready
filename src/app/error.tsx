"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <Logo />
      <AlertTriangle className="mt-8 text-[var(--color-critical)]" size={32} />
      <h1 className="mt-4 text-xl font-bold text-[var(--color-ink)]">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)] max-w-sm">
        An unexpected error occurred. You can try again, or head back to the dashboard.
      </p>
      <Button onClick={reset} className="mt-6">Try again</Button>
    </div>
  );
}
