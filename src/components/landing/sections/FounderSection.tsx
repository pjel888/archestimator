import { SectionShell } from "./SectionShell";

/**
 * FounderSection — homepage Section 9 (doc 02 §1, doc 05 §Section 9).
 *
 * Introduction-energy founder voice; the two-sides lived gap.
 *
 * ⚠️ GATED ON L-FND-1 (founder public bio assets). Until they land, this
 * section ships the §11.5 paragraphs ONLY — no invented credentials, no
 * photo (reserved slot, no CLS). RSC.
 */
export function FounderSection() {
  return (
    <SectionShell
      id="company"
      label="The company"
      eyebrow="The company"
      heading="A new company, building for teams who live in spreadsheets."
    >
      <div className="grid gap-[var(--landing-space-xl)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-[var(--landing-space-md)]">
          <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body-lg leading-landing-prose text-landing-ink text-pretty">
            Archestimator started with a simple frustration: every estimate holds real commercial
            knowledge — your prices, your suppliers, your judgment — and every time a project ends,
            that knowledge dies in a spreadsheet. The next job starts from row one.
          </p>
          <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary text-pretty">
            We are building the cost intelligence layer for teams who live in those spreadsheets. Not
            an enterprise suite that takes months to set up, but a workspace where your own estimating
            work compounds: structured estimates, a reusable library, a clean revision record, and
            proposals your clients can actually review and approve. Built by someone who has worked
            both sides of this, the design and cost side, and the software side.
          </p>
          <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary text-pretty">
            This is a new company and an early product. We would rather tell you exactly what it does
            today and where it is going than oversell it. That honesty is part of how we work.
          </p>
        </div>
        {/* L-FND-1 GATED — founder bio assets (credentials, photo, links) reserved here.
            The slot is sized so a future photo lands without CLS. No invented credentials. */}
        <div
          aria-hidden="true"
          data-landing-founder-slot="reserved"
          className="relative min-h-[260px] overflow-hidden rounded-landing-panel border border-landing-hairline bg-surface"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--brand-orange-soft)_0%,transparent_60%)] opacity-60" />
          <div className="absolute inset-0 flex items-end p-[var(--landing-space-lg)]">
            <p className="font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
              Built by Philip — architect, renderer, and former software engineer.
            </p>
          </div>
        </div>
      </div>
      <p className="mt-[var(--landing-space-md)] text-landing-text-caption text-landing-ink-muted">
        Founder bio and photo are coming. We won’t invent credentials.
      </p>
    </SectionShell>
  );
}
