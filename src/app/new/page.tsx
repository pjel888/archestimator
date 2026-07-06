import type { Metadata } from "next";
import { PublicPageShell } from "@/components/landing";
import { NewLandingPage } from "@/components/landing-new/NewLandingPage";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";

export const metadata: Metadata = buildLandingMetadata({
  title: "Archestimator — Estimates, proposals and approvals",
  description:
    "Build estimates from reusable costs, send client-ready proposals, and keep revisions, comments, and approvals attached.",
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
