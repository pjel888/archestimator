import type { Metadata } from "next";
import { PublicPageShell } from "@/components/landing";
import { NewLandingPage } from "@/components/landing-new/NewLandingPage";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";

export const metadata: Metadata = buildLandingMetadata({
  title: "Archestimator — Construction estimate-to-proposal workspace",
  description:
    "Structure project costs from your own reusable cost knowledge, send a clear client proposal, and keep feedback and revisions connected.",
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
