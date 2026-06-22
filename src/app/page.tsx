import type { Metadata } from "next";

import { PublicPageShell } from "@/components/landing/PublicPageShell";
import { RedesignedLandingPage } from "@/components/landing/gpt-taste/RedesignedLandingPage";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

export const metadata: Metadata = {
  title: "Archestimator - cost intelligence for every estimate",
  description:
    "Archestimator turns your own prices, suppliers, assemblies, revisions, and proposal history into reusable commercial memory for AEC estimating teams.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Archestimator - cost intelligence for every estimate",
    description:
      "Build estimates from your own commercial memory, keep the revision record attached, and share proposal links clients can approve.",
    url: "/",
    type: "website",
  },
};

export default async function LandingPage() {
  const isLoggedIn = await getLandingAuthState();

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={true}>
      <RedesignedLandingPage isLoggedIn={isLoggedIn} />
    </PublicPageShell>
  );
}
