import type { Metadata } from "next";
import { ArchestimatorLandingPage } from "@/components/landing-v3/ArchestimatorLandingPage";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import {
  PublicPageShell,
  ABExperimentProvider,
} from "@/components/landing";

export const metadata: Metadata = buildLandingMetadata({
  title: "Archestimator — Construction estimating, proposals and approvals",
  description:
    "Build structured estimates from reusable cost knowledge, send client-ready proposals, capture revisions, and keep approvals on record in one connected workspace.",
  path: "/",
});

export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <PublicPageShell isHomePage={true}>
      <ABExperimentProvider experimentId="hero-cta-copy" variant="A">
        <ArchestimatorLandingPage />
      </ABExperimentProvider>
    </PublicPageShell>
  );
}
