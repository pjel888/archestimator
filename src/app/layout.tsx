import type { Metadata } from "next";
import { Doto, Roboto_Mono } from "next/font/google";
import { VercelWebAnalytics } from "@/components/analytics/VercelWebAnalytics";
import { LiquidGlassReady } from "@/components/system/LiquidGlassReady";
import { AppProviders } from "./providers";
import "./globals.css";

const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"], display: "swap" });
// Technical display face for the Workshop dashboard's editorial headline layer,
// inspired by the "Improve ROI" reference. Body UI keeps the SF Pro stack.
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Archestimator | Quote, Proposal & Estimate Workspace",
  description: "A workspace for teams that build quotes, estimates, and proposals from reusable line items, supplier context, assumptions, and document-ready handoff steps.",
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
      <body className={`${robotoMono.variable} ${doto.variable}`}>
        <AppProviders>{children}</AppProviders>
        {/* Arms the deferred liquid-glass blur after first paint + idle. Renders
            null; the glass surfaces ship blur-off so first paint stays cheap. */}
        <LiquidGlassReady />
        <VercelWebAnalytics />
      </body>
    </html>
  );
}
