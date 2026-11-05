import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-grid">
      <Link href="/"><Logo /></Link>
      <h1 className="mt-8 text-6xl font-bold text-[var(--color-ink)]">404</h1>
      <p className="mt-3 text-[var(--color-muted)]">We couldn&apos;t find the page you&apos;re looking for.</p>
      <LinkButton href="/" className="mt-6">Back to home</LinkButton>
    </div>
  );
}
