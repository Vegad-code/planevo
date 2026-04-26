import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
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
  title: "Plant Pilot — The only productivity app that works even when you don't want to",
  description:
    "Plant Pilot is a proactive AI-powered time management app. Meet Ollie, your AI life coach who adapts your schedule, nudges you gently, and coaches you through your day.",
  keywords: [
    "productivity",
    "time management",
    "AI coach",
    "task manager",
    "habit tracker",
    "focus timer",
    "Plant Pilot",
  ],
  openGraph: {
    title: "Plant Pilot — AI-Powered Productivity",
    description:
      "Meet Ollie, your AI life coach. Plant Pilot actively nudges you, adapts your schedule, and coaches you through your day.",
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
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
