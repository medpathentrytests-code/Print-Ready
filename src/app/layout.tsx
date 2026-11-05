import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrintReady — Catch costly printing mistakes before you publish",
  description:
    "PrintReady is an automated PDF preflight and quality assurance platform for self-publishers and print-on-demand creators. Inspect, analyse and improve your publishing files before sending them to print.",
  metadataBase: new URL("https://printready.app"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[var(--color-ink)]">{children}</body>
    </html>
  );
}
