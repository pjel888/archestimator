import type { Metadata } from "next";
import { Inter, Roboto_Mono, Source_Serif_4 } from "next/font/google";
import { VercelWebAnalytics } from "@/components/analytics/VercelWebAnalytics";
import { AppProviders } from "./providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
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
      <body className={`${inter.variable} ${robotoMono.variable} ${sourceSerif.variable}`}>
        <AppProviders>{children}</AppProviders>
        <VercelWebAnalytics />
      </body>
    </html>
  );
}
