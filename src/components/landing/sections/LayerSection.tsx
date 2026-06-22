import { SectionShell } from "./SectionShell";

/**
 * LayerSection — homepage Section 3 (doc 02 §1, doc 05 §Section 3).
 *
 * Declares the cost intelligence layer + frames the commercial-graph plate.
 * The plate itself (ArchitecturePlate + PlateCaption) is composed in
 * page.tsx and dropped in as `children` here so this section stays a pure
 * copy frame that reuses across routes.
 *
 * RSC.
 */
export interface LayerSectionProps {
  /** The commercial-graph plate (ArchitecturePlate + PlateCaption). Injected by page.tsx. */
  children?: React.ReactNode;
}

export function LayerSection({ children }: LayerSectionProps) {
  return (
    <SectionShell
      id="layer"
      label="The cost intelligence layer"
      eyebrow="Cost intelligence layer"
      accentRail
      heading="Your commercial graph, built while you estimate."
      lead={
        <>
          Prices, components, suppliers, revisions, comments, decisions, and exports stay connected.
          The estimate becomes a record your team can reuse.
        </>
      }
      className="gsap-pin-proof"
    >
      {children ? (
        <div
          data-plate-root="true"
          className="dashboard-glass-warm relative mt-[var(--landing-space-xl)] overflow-hidden rounded-landing-panel border border-landing-hairline-strong p-[var(--landing-space-lg)] sm:p-[var(--landing-space-xl)]"
        >
          {children}
        </div>
      ) : null}

      <p className="mt-[var(--landing-space-md)] max-w-[var(--landing-measure-prose)] text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
        The foundation is explicit: structured estimates, reusable library data, project records,
        Activity, version history, project comparison charts, and proposal handoff.
      </p>

      <div className="mt-[var(--landing-space-lg)] rounded-landing-panel border border-landing-hairline-strong bg-surface p-[var(--landing-space-lg)]">
        <p className="flex items-center gap-[var(--landing-space-2xs)] font-landing-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
          <span aria-hidden="true" className="inline-block h-[14px] w-[2px] rounded-full bg-brand-orange" />
          What this is not.
        </p>
        <p className="mt-[var(--landing-space-2xs)] text-landing-text-body leading-landing-prose text-landing-ink-secondary">
          Not an aggregator. Not a marketplace of other firms&rsquo; rates. Not a magic number generator.
          The intelligence is yours, built from your own work.
        </p>
      </div>
    </SectionShell>
  );
}
