import { LandingCTAs } from "./LandingCTAs";
import { MaturityTag } from "@/components/landing/shell/MaturityTag";

/**
 * FinalCtaSection — homepage Section 11 (doc 02 §1, doc 05 §Section 11).
 *
 * Calm, not loud. Restates the hook, carries both CTAs, persistent maturity
 * tag. Sits on a closing glass panel. RSC; `isLoggedIn` swaps the primary.
 */
export interface FinalCtaSectionProps {
  isLoggedIn?: boolean;
}

export function FinalCtaSection({ isLoggedIn = false }: FinalCtaSectionProps) {
  return (
    <section
      aria-label="Get started"
      data-landing-section="final-cta"
      data-reveal="true"
      className="px-[var(--landing-section-pad-x)] py-[var(--landing-section-pad-y)]"
    >
      <div className="dashboard-glass mx-auto flex w-full max-w-[1180px] flex-col items-start gap-[var(--landing-space-md)] rounded-landing-panel border border-landing-hairline-strong p-[var(--landing-space-xl)] sm:p-[var(--landing-space-3xl)]">
        <p className="inline-flex items-center gap-[var(--landing-space-2xs)] font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
          <span aria-hidden="true" className="inline-block h-[14px] w-[2px] rounded-full bg-brand-orange" />
          Start free
        </p>
        <h2 className="max-w-[36rem] font-display text-landing-headline leading-landing-headline tracking-landing-headline text-landing-ink text-balance">
          Every estimate, working for you on the next one.
        </h2>
        <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body-lg leading-landing-prose text-landing-ink-secondary text-pretty">
          Build your first estimate from a reusable library, keep every revision on the record, and
          send a proposal your client can actually review and approve.
        </p>
        <LandingCTAs isLoggedIn={isLoggedIn} location="final-cta" className="mt-[var(--landing-space-sm)]" />
        <div className="mt-[var(--landing-space-xs)] flex items-center gap-[var(--landing-space-2xs)]">
          <MaturityTag size="md" />
          <span className="text-landing-text-caption text-landing-ink-muted">
            Free to try during closed beta · no card required.
          </span>
        </div>
      </div>
    </section>
  );
}
