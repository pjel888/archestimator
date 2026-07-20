import type { Metadata } from "next";
import { PublicPageShell } from "@/components/landing";
import { NewLandingPage } from "@/components/landing-new/NewLandingPage";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";

export const metadata: Metadata = buildLandingMetadata({
  title: "Archestimator — Construction estimating software for AEC teams",
  description:
    "Archestimator helps AEC teams reduce rework, communicate project costs clearly, and move decisions forward without losing context through reviews and revisions.",
  path: "/new",
});

export const dynamic = "force-static";

export default function NewLandingRoute() {
  return (
    <PublicPageShell isHomePage={true}>
      <NewLandingPage />
    </PublicPageShell>
  );
}
