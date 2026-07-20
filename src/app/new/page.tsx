import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NewLandingExperience } from "@/components/landing/new-redesign/NewLandingExperience";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-new-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Archestimator — Build estimates with context intact",
  description:
    "Construction estimating software that connects structured estimates, reusable cost knowledge, proposal output, review, and decision context.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Archestimator — Build estimates with context intact",
    description: "Make every estimate easier to build, clearer to present, and simpler to approve.",
    url: "/new",
    siteName: "Archestimator",
    type: "website",
    images: [{ url: "/landing/new/og-new.png", width: 1200, height: 630, alt: "Archestimator construction estimate-to-proposal workspace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Archestimator — Build estimates with context intact",
    description: "Make every estimate easier to build, clearer to present, and simpler to approve.",
    images: ["/landing/new/og-new.png"],
  },
};

export const dynamic = "force-static";

export default function NewLandingRoute() {
  return <NewLandingExperience fontClassName={inter.variable} />;
}
