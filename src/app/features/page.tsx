import type { Metadata } from "next";
import Link from "next/link";

import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import { PublicPageShell } from "@/components/landing";
import { LandingShellClient } from "@/components/landing/shell/LandingShellClient";
import { SectionShell } from "@/components/landing/sections/SectionShell";
import { FinalCtaSection } from "@/components/landing/sections/FinalCtaSection";
import { LandingCTAs } from "@/components/landing/sections/LandingCTAs";
import { ClaimsLedger } from "@/components/landing/claims-ledger/ClaimsLedger";

export const metadata: Metadata = buildLandingMetadata({
  title: "Features — every feature, with its status",
  description:
    "The estimate workspace, the reusable library, the revision record, and the proposal handoff — each tagged Live, Building, or Planned, so you know exactly what ships today and what is on the roadmap.",
  path: "/features",
});

export default async function FeaturesPage() {
  const isLoggedIn = await getLandingAuthState();
  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      <LandingShellClient>
        <main data-landing-page-root="true" id="main-content">
          {/* Hero (compact) */}
          <SectionShell
            id="features-hero"
            label="Features"
            eyebrow="Features"
            accentRail
            heading="Every feature, with its status."
            lead="The estimate workspace, the reusable library, the revision record, and the proposal handoff — each one tagged Live, Building, or Planned, so you know exactly what ships today and what is on the roadmap."
          >
            <LandingCTAs isLoggedIn={isLoggedIn} location="final-cta" />
          </SectionShell>

          {/* The full claims ledger, expanded */}
          <SectionShell
            id="features-ledger"
            label="Live, Building, Planned"
            eyebrow="The ledger"
            heading="The honest feature list."
            lead="No logos, no testimonials, no inflated roadmap. Every capability carries a status, and the boundary lines state plainly what Archestimator is not."
          >
            <ClaimsLedger enableFilter variant="full" title={null} />
          </SectionShell>

          {/* AI, deferred (honest) */}
          <SectionShell
            id="features-ai"
            label="AI, deferred"
            eyebrow="AI"
            heading="AI is on the roadmap, not in the product today."
            lead="When it ships, the AI copilot enters at Pro and up, Ask-only first, with a visible privacy note near every mention. It will not write, edit, or estimate for you — your numbers always come from your library and your inputs."
          >
            <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary">
              Read more on the{" "}
              <Link
                href="/trust"
                className="font-medium text-brand-orange-dark underline decoration-landing-hairline underline-offset-4 hover:decoration-brand-orange"
              >
                Trust page
              </Link>
              .
            </p>
          </SectionShell>

          <FinalCtaSection isLoggedIn={isLoggedIn} />
        </main>
      </LandingShellClient>
    </PublicPageShell>
  );
}
