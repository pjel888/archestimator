import type { Metadata } from "next";

import { ABExperimentProvider, PublicPageShell } from "@/components/landing";
import { ArchestimatorLandingPage } from "@/components/landing-v3/ArchestimatorLandingPage";

export const metadata: Metadata = {
  title: {
    absolute: "Archestimator legacy landing — Reference",
  },
  description: "The previous Archestimator landing page, kept as a pre-release reference.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function LegacyLandingReferenceRoute() {
  return (
    <PublicPageShell isHomePage>
      <ABExperimentProvider experimentId="hero-cta-copy" variant="A">
        <ArchestimatorLandingPage />
      </ABExperimentProvider>
    </PublicPageShell>
  );
}
