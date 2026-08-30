import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import LayoutProvider from "@/components/providers/LayoutProvider";
import AnalyticsProvider from "@/components/providers/AnalyticsProvider";
import ServiceWorkerProvider from "@/components/providers/ServiceWorkerProvider";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import StructuredData from "@/components/ui/StructuredData";
import { SITE_CONFIG, getOrganizationSchema, getSoftwareApplicationSchema } from "@/lib/config/seo";

// Validate environment variables on startup
import "@/lib/env";

// IBM Plex Sans is the product face: a humanist sans with a tall x-height that
// stays legible at the 13-14px the tool is built at. Self-hosted by next/font,
// exposed as --font-ui (lib/theme.ts + globals.css). The marketing tree loads
// its own Cabinet Grotesk from app/(marketing)/marketing.css.
const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
});

// JetBrains Mono for tabular data
const jetbrainsMono = JetBrains_Mono({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.title,
    template: "%s - Spartan",
  },
  description: SITE_CONFIG.description,
  keywords: [...SITE_CONFIG.keywords],
  authors: [{ name: "Spartan Team" }],
  creator: "Spartan",
  publisher: "Spartan",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome", url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { rel: "android-chrome", url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_CONFIG.url,
    siteName: "Spartan",
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: [
      {
        url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`,
        width: 1200,
        height: 630,
        alt: "Spartan - Free Sports Team Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    ...(SITE_CONFIG.twitterHandle
      ? { site: SITE_CONFIG.twitterHandle, creator: SITE_CONFIG.twitterHandle }
      : {}),
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: [`${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`],
  },
  alternates: {
    canonical: SITE_CONFIG.url,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: InitColorSchemeScript (in ThemeProvider) stamps
    // data-mui-color-scheme on <html> before hydration to avoid a theme flash;
    // that intentional pre-hydration mutation would otherwise trip React's
    // attribute-mismatch warning on <html>. Scoped one level deep — real
    // mismatches in descendants are still reported.
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}>
        <StructuredData
          data={[getOrganizationSchema(), getSoftwareApplicationSchema()]}
        />
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <SessionProvider>
                <AnalyticsProvider />
                <ServiceWorkerProvider />
                <LayoutProvider>
                  {children}
                </LayoutProvider>
              </SessionProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
