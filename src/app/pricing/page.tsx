import type { Metadata } from "next";

import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import { PublicPageShell } from "@/components/landing";
import { LandingShellClient } from "@/components/landing/shell/LandingShellClient";
import { SectionShell } from "@/components/landing/sections/SectionShell";
import { FinalCtaSection } from "@/components/landing/sections/FinalCtaSection";
import { LandingCTAs } from "@/components/landing/sections/LandingCTAs";
import { StatusPill } from "@/components/landing/shared/StatusPill";

export const metadata: Metadata = buildLandingMetadata({
  title: "Pricing, honestly",
  description:
    "Freemium, seat-based, peso-denominated, never metered on estimating, exports, or BOQ lines. A permanent free tier so your library can accumulate. Pricing numbers are being validated and will be published once they are.",
  path: "/pricing",
});

export default async function PricingPage() {
  const isLoggedIn = await getLandingAuthState();
  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      <LandingShellClient>
        <main data-landing-page-root="true" id="main-content">
          {/* Hero (compact) */}
          <SectionShell
            id="pricing-hero"
            label="Pricing, honestly"
            eyebrow="Pricing, honestly"
            accentRail
            heading="Simple enough to actually adopt. Honest about what it costs and why."
            lead="Pricing numbers are a hypothesis we are validating, not a locked price. Read the philosophy below — the numbers come once validation closes."
          >
            {null}
          </SectionShell>

          {/* Pricing philosophy */}
          <SectionShell
            id="pricing-philosophy"
            label="Pricing philosophy"
            eyebrow="Philosophy"
            heading="Freemium. Seat-based. Priced in pesos. Never meters the work."
          >
            <div className="grid gap-[var(--landing-space-lg)] md:grid-cols-2">
              <div className="rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-lg)]">
                <h3 className="font-display text-landing-text-title leading-landing-tight text-landing-ink">
                  What we can say today
                </h3>
                <p className="mt-[var(--landing-space-sm)] text-landing-text-body leading-landing-prose text-landing-ink-secondary">
                  Freemium and seat-based, priced in pesos, billed locally. The compounding cost
                  library is the lock-in, so we let you build it free and charge to share,
                  collaborate, and scale. We do not meter estimating, exports, or BOQ lines — that
                  would tax the exact behavior that builds the moat. A permanent free tier, not just
                  a trial, so the library can accumulate.
                </p>
              </div>
              <div className="rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-lg)]">
                <h3 className="font-display text-landing-text-title leading-landing-tight text-landing-ink">
                  What we will never meter
                </h3>
                <ul className="mt-[var(--landing-space-sm)] flex flex-col gap-[var(--landing-space-2xs)]">
                  {NEVER_METERED.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-[var(--landing-space-2xs)] text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[6px] inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-brand-orange"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionShell>

          {/* The cement anchor — CONCEPT ONLY, labeled hypothesis */}
          <SectionShell
            id="pricing-cement"
            label="The cement anchor — a concept"
            eyebrow="Concept · hypothesis"
            heading="A tool that compounds on every estimate should cost less than a material you pour once."
          >
            <div className="rounded-landing-panel border border-landing-hairline-strong bg-surface p-[var(--landing-space-lg)]">
              <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body-lg leading-landing-prose text-landing-ink text-pretty">
                Our framing anchor is a bag of cement — the most iconic, instantly-priced unit in
                Philippine construction. The idea is that a tool that compounds on every estimate you
                make should cost less, per month, than a material you pour once.
              </p>
              <p className="mt-[var(--landing-space-md)] max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary">
                That is a concept for how we think about value, not a published price. The full
                pricing model — tiers, numbers, the founding-member rate — is being validated with
                the teams we are building for, and will be published once it is.
              </p>
              <p className="mt-[var(--landing-space-sm)] flex items-center gap-[var(--landing-space-2xs)]">
                <StatusPill status="Building" size="sm" />
                <span className="text-landing-text-caption text-landing-ink-muted">
                  Hypothesis · pending discovery + Van Westendorp validation.
                </span>
              </p>
            </div>
          </SectionShell>

          {/* Tier shape (names only, labeled hypothesis) */}
          <SectionShell
            id="pricing-tiers"
            label="The intended tier shape"
            eyebrow="Tier shape · no numbers"
            heading="The intended shape is Free → Solo → Pro → Team."
            lead="Plus an Education tier and a future Owner/Portfolio tier for the client side. Names only — numbers are pending validation."
          >
            <ol className="grid gap-[var(--landing-space-md)] sm:grid-cols-2 lg:grid-cols-4">
              {TIER_SHAPE.map((tier) => (
                <li
                  key={tier.name}
                  className="flex h-full flex-col gap-[var(--landing-space-2xs)] rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-md)]"
                >
                  <h3 className="font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
                    {tier.name}
                  </h3>
                  <p className="text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                    {tier.note}
                  </p>
                </li>
              ))}
            </ol>
          </SectionShell>

          {/* How we are validating price */}
          <SectionShell
            id="pricing-validation"
            label="How we are validating price"
            eyebrow="Validation"
            heading="Before any number goes public."
          >
            <ul className="grid gap-[var(--landing-space-sm)] sm:grid-cols-2">
              {VALIDATION.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-[var(--landing-space-sm)] rounded-landing-dense border border-landing-hairline bg-surface p-[var(--landing-space-md)]"
                >
                  <span className="mt-[2px] shrink-0">
                    <StatusPill status="Building" size="sm" />
                  </span>
                  <span className="text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <LandingCTAs
              className="mt-[var(--landing-space-lg)]"
              layout="stack"
              isLoggedIn={isLoggedIn}
              location="final-cta"
            />
          </SectionShell>

          <FinalCtaSection isLoggedIn={isLoggedIn} />
        </main>
      </LandingShellClient>
    </PublicPageShell>
  );
}

const NEVER_METERED = [
  "Estimating. Build as many estimates as you need.",
  "Exports. Generate proposal .xlsx workbooks without a counter.",
  "BOQ lines. Quantity and line items are never usage-metered.",
  "The library accumulating. That is the moat — we do not tax it.",
] as const;

const TIER_SHAPE = [
  { name: "Free", note: "A permanent tier, not a trial. Seeds the component library." },
  { name: "Solo", note: "For solo contractors, estimators, architects. Sharing + proposals." },
  { name: "Pro", note: "Serious solo operators. Own branding, deeper analytics, priority support." },
  { name: "Team", note: "Firms and QS teams. Multiple seats, shared library, admin controls." },
] as const;

const VALIDATION = [
  "At least 5 qualified discovery calls with teams who estimate today.",
  "At least 2 active users building a real or serious-demo estimate.",
  "A clear signal on document handoff and proposal value.",
  "The support burden understood before pricing for scale.",
  "A Van Westendorp Price Sensitivity Meter study with target users.",
] as const;
