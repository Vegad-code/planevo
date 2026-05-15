import type { Metadata } from "next";
import { Inter, Outfit, Fraunces, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
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
      className={`${inter.variable} ${outfit.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Toaster richColors position="bottom-right" />
        {children}
      </body>
    </html>
  );
}
