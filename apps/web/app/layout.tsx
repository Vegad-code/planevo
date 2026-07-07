import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Instrument_Serif, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { AppearanceNoFlashScript } from "@/components/appearance/AppearanceNoFlashScript";
import { PUBLIC_APPEARANCE } from "@/lib/appearance/public-route";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-marketing-sans",
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
  title: "Planevo — A plan that adapts.",
  description:
    "For students whose calendars change faster than they can replan. Planevo builds your day around your real availability — and adapts when life happens.",
  authors: [{ name: "Planevo Team" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://planevo.ai",
    siteName: "Planevo",
    title: "Planevo — A plan that adapts.",
    description:
      "Dump everything on your plate. Planevo turns it into a calm board, then places the work into the real free time on your calendar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planevo — A plan that adapts.",
    description:
      "A calm board of everything on your plate, planned into your real free time.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const isPublic = headerStore.get("x-planevo-public") === "true";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${inter.variable} h-full antialiased`}
      data-public={isPublic ? "true" : undefined}
      data-accent={isPublic ? PUBLIC_APPEARANCE.accent : "amber"}
      data-color-theme={isPublic ? PUBLIC_APPEARANCE.colorTheme : "daylight"}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppearanceNoFlashScript />
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
