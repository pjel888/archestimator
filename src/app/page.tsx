import type { Metadata } from "next";

import { ArchestimatorNewLandingPage as ArchestimatorProductionLandingPage } from "@/components/landing-production/ArchestimatorNewLandingPage";
import { ProductionPublicPageShell } from "@/components/landing-production/ProductionPublicPageShell";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";

export const metadata: Metadata = buildLandingMetadata({
  title: "Construction estimating from estimate to proposal",
  description:
    "Build structured estimates, reuse cost knowledge, present clearer proposals, and keep reviews and revisions connected. Request beta access to Archestimator.",
  path: "/",
});

export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <ProductionPublicPageShell>
      <ArchestimatorProductionLandingPage />
    </ProductionPublicPageShell>
  );
}
