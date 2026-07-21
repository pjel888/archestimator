import type { Metadata } from "next";
import { ArchestimatorNewLandingPage } from "@/components/landing-new/ArchestimatorNewLandingPage";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import { PublicPageShell } from "@/components/landing";

export const metadata: Metadata = buildLandingMetadata({
  title: "Construction estimating from estimate to proposal",
  description:
    "Build structured estimates, reuse cost knowledge, present clearer proposals, and keep reviews and revisions connected. Request beta access to Archestimator.",
  path: "/",
});

export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <PublicPageShell isHomePage>
      <ArchestimatorNewLandingPage />
    </PublicPageShell>
  );
}
