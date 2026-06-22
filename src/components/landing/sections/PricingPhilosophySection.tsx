import Link from "next/link";
import { SectionShell } from "./SectionShell";
import { LandingCTAs } from "./LandingCTAs";

/**
 * PricingPhilosophySection — homepage Section 10 (doc 02 §1, doc 05 §Section 10).
 *
 * Pricing PHILOSOPHY ONLY — no published numbers. The cement anchor is a
 * CONCEPT, clearly labeled HYPOTHESIS (§9.3). The ₱ symbol may appear ONLY
 * in the labeled-hypothesis concept block; no Solo/Pro/Team price figures.
 *
 * ⚠️ GATED ON L-PRC-1: ≥5 discovery calls + ≥2 beta builds + Van Westendorp
 * before any peso number is published. This section ships philosophy only.
 * RSC.
 */
export function PricingPhilosophySection() {
  return (
    <SectionShell
      id="pricing"
      label="Pricing, honestly"
      eyebrow="Pricing, honestly"
      heading="Simple enough to actually adopt. Honest about what it costs and why."
    >
      <div className="grid gap-[var(--landing-space-xl)] lg:grid-cols-2">
        <div className="flex flex-col gap-[var(--landing-space-md)]">
          <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body-lg leading-landing-prose text-landing-ink text-pretty">
            Archestimator is freemium and seat-based, priced in pesos, billed locally. The compounding
            cost library is the lock-in, so we let you build it free and charge to share, collaborate,
            and scale.
          </p>
          <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary text-pretty">
            We do not meter estimating, exports, or BOQ lines — that would tax the exact behavior that
            builds the moat. A permanent free tier, not just a trial, so the library can accumulate.
          </p>
          <LandingCTAs
            className="mt-[var(--landing-space-sm)]"
            layout="stack"
            location="final-cta"
          />
        </div>

        {/* The cement anchor — CONCEPT ONLY, clearly labeled HYPOTHESIS.
            No published number. ₱ appears only as the framing figure, labeled hypothesis. */}
        <div className="rounded-landing-panel border border-landing-hairline-strong bg-surface p-[var(--landing-space-lg)]">
          <p className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
            Concept · hypothesis
          </p>
          <p className="mt-[var(--landing-space-sm)] font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
            Our framing anchor is a bag of cement — the most iconic, instantly-priced unit in
            Philippine construction.
          </p>
          <p className="mt-[var(--landing-space-sm)] text-landing-text-body leading-landing-prose text-landing-ink-secondary">
            The idea: a tool that compounds on every estimate you make should cost less, per month,
            than a material you pour once. That is a concept for how we think about value, not a
            published price.
          </p>
          <p className="mt-[var(--landing-space-md)] text-landing-text-body-sm leading-landing-prose text-landing-ink-muted">
            The full pricing model — tiers, numbers, the founding-member rate — is being validated
            with the teams we are building for, and will be published once it is.{" "}
            <Link
              href="/pricing"
              className="font-medium text-brand-orange-dark underline decoration-landing-hairline underline-offset-4 hover:decoration-brand-orange"
            >
              Read the pricing philosophy →
            </Link>
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
