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
  title: "Plan Pilot — The shame-free planner for ADHD students drowning in Canvas deadlines",
  description:
    "Plan Pilot is the calm AI co-pilot for ADHD college students. Connect Canvas, generate a daily plan around your energy, and let Ollie reorganize tomorrow whenever life slips — without the guilt.",
  keywords: [
    "ADHD planner",
    "student productivity",
    "Canvas LMS",
    "AI scheduler",
    "shame-free planner",
    "time management",
    "Ollie",
    "Plan Pilot",
  ],
  openGraph: {
    title: "Plan Pilot — Shame-free planning for ADHD students",
    description:
      "Connect Canvas, generate an energy-aware daily plan, and let Ollie reorganize tomorrow when life slips. Built for brains that don't run on willpower.",
    type: "website",
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
