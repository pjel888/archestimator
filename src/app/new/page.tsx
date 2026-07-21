import type { Metadata } from "next";

import { PublicPageShell } from "@/components/landing";
import { ArchestimatorNewLandingPage } from "@/components/landing-new/ArchestimatorNewLandingPage";

export const metadata: Metadata = {
  title: {
    absolute: "Archestimator — Construction estimating from estimate to proposal",
  },
  description:
    "Build structured estimates, reuse cost knowledge, present clearer proposals, and keep reviews and revisions connected. Request early access to Archestimator.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function NewLandingRoute() {
  return (
    <PublicPageShell isHomePage>
      <ArchestimatorNewLandingPage />
    </PublicPageShell>
  );
}
