import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plan Pilot — The proactive AI planner for busy students and high-performers",
  description:
    "Plan Pilot is the calm AI co-pilot for high-performers. Sync your tasks, generate a daily plan around your energy, and let Ollie reorganize tomorrow whenever life slips — without the guilt.",
  keywords: [
    "AI planner",
    "focus assistant",
    "student productivity",
    "automatic scheduling",
    "time management",
  ],
  authors: [{ name: "Plan Pilot Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://planpilot.ai",
    title: "Plan Pilot — Shame-free planning for high-performers",
    description:
      "Connect Canvas, generate an energy-aware daily plan, and let Ollie reorganize tomorrow when life slips. Built for brains that don't run on willpower.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Toaster richColors position="bottom-right" />
        {children}
      </body>
    </html>
  );
}
