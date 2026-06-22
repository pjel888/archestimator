import type { Metadata } from "next";
import { Doto, Geist, Roboto_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { VercelWebAnalytics } from "@/components/analytics/VercelWebAnalytics";
import { LiquidGlassReady } from "@/components/system/LiquidGlassReady";
import { LandingStructuredData } from "@/components/landing/structured-data";
import { LANDING_SITE_ORIGIN } from "@/lib/landing/seo-metadata";
import { AppProviders } from "./providers";
import "./globals.css";

const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"], display: "swap" });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
// Technical display face for the Workshop dashboard's editorial headline layer,
// inspired by the "Improve ROI" reference. Body UI keeps the SF Pro stack.
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(LANDING_SITE_ORIGIN), // L-SEO-1 placeholder origin until domain confirmed
  title: {
    default: "Archestimator — your cost intelligence layer for AEC teams",
    template: "%s — Archestimator",
  },
  description:
    "A construction cost estimating platform where every estimate becomes reusable commercial knowledge. Build from a library of your real prices and suppliers, keep every revision on the record, and share proposals your clients can approve.",
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico", sizes: "any" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/favicon_io/site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${robotoMono.variable} ${geist.variable} ${doto.variable}`}>
        <AppProviders>{children}</AppProviders>
        {/* JSON-LD structured data (Organization + WebSite) sitewide (doc 13 §4). */}
        <LandingStructuredData />
        {/* Arms the deferred liquid-glass blur after first paint + idle. Renders
            null; the glass surfaces ship blur-off so first paint stays cheap. */}
        <LiquidGlassReady />
        <VercelWebAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
