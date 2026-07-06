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
  metadataBase: new URL("https://planevo.ai"),
  title: "Planevo — Your week, handled.",
  description:
    "For students whose calendars change faster than they can replan. Planevo builds your day around your real availability — and adapts when life happens.",
  authors: [{ name: "Planevo Team" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://planevo.ai",
    siteName: "Planevo",
    title: "Planevo — Your week, handled.",
    description:
      "Dump everything on your plate. Planevo turns it into a calm board, then places the work into the real free time on your calendar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planevo — Your week, handled.",
    description:
      "A calm board of everything on your plate, planned into your real free time.",
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
