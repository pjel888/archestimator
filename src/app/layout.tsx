import type { Metadata } from "next";
import { Roboto_Mono, Zilla_Slab } from "next/font/google";
import { VercelWebAnalytics } from "@/components/analytics/VercelWebAnalytics";
import { AppProviders } from "./providers";
import "./globals.css";

const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });
// Display slab for the Workshop dashboard hero + section titles (drafting-stamp
// character that complements the terracotta brand). Loaded via next/font so the
// CSS variable is self-hosted and font-display:swap guards against layout shift.
// Body UI keeps the SF Pro system stack; this only extends the scale.
const zillaSlab = Zilla_Slab({
  variable: "--font-zilla-slab",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      <body className={robotoMono.variable}>
        <AppProviders>{children}</AppProviders>
        <VercelWebAnalytics />
      </body>
    </html>
  );
}
