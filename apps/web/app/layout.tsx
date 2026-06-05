import type { Metadata } from "next";
import { Suspense } from "react";
import { Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceProvider, appearanceNoFlashScript } from "@/components/providers/AppearanceProvider";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Planevo — The proactive AI planner for busy students and high-performers",
  description:
    "Planevo is the calm AI co-pilot for high-performers. Sync your tasks, generate a daily plan around your energy, and let Bruno reorganize tomorrow whenever life slips — without the guilt.",
  keywords: [
    "AI planner",
    "focus assistant",
    "student productivity",
    "automatic scheduling",
    "time management",
  ],
  authors: [{ name: "Planevo Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://planevo.ai",
    title: "Planevo — Shame-free planning for high-performers",
    description:
      "Connect Canvas, generate an energy-aware daily plan, and let Bruno reorganize tomorrow when life slips. Built for brains that don't run on willpower.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceNoFlashScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          themes={["light", "dark", "sepia"]}
          enableSystem
          disableTransitionOnChange
        >
          <AppearanceProvider>
            <Toaster richColors position="bottom-right" />
            <Suspense fallback={null}>
              <PostHogProvider>{children}</PostHogProvider>
            </Suspense>
          </AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
