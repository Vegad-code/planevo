import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { appearanceNoFlashScript } from "@/lib/appearance/no-flash-script";
import "./globals.css";

// Display serif — closest free match to littlebird.ai's Meraki (high-contrast,
// editorial headings). Not Instrument Serif or Fraunces.
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
  title: "Planevo — A plan that adapts. Never breaks.",
  description:
    "Free for students and high-performers whose calendars change faster than they can replan. Planevo builds each day around your real availability — then quietly adapts when life gets in the way. Go Pro to unlock everything.",
  keywords: [
    "student planner",
    "free planner",
    "calendar planning",
    "Canvas sync",
    "plan my day",
    "student productivity",
    "time management",
  ],
  authors: [{ name: "Planevo Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://planevo.ai",
    title: "Planevo — A plan that adapts. Never breaks.",
    description:
      "Dump everything on your plate — free. Planevo turns it into a calm board of real responsibilities, then places the work into the real free time on your calendar.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: appearanceNoFlashScript }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider          attribute="class"
          defaultTheme="system"
          themes={["light", "dark"]}
          enableSystem
          disableTransitionOnChange
        >
          <AppearanceProvider>
            <Toaster />
            <PostHogProvider>{children}</PostHogProvider>
          </AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
