import { SectionShell } from "./SectionShell";

/**
 * HowItWorksSection — homepage Section 5 (doc 02 §1, doc 05 §Section 5).
 *
 * Workflow cards with strict reference-inspired frames. RSC.
 */

const STEPS = [
  {
    label: "Build",
    title: "Create the estimate tree.",
    body: "Groups, Areas, rows, quantities, and totals stay legible.",
  },
  {
    label: "Reuse",
    title: "Drag in components.",
    body: "Your library carries real prices, suppliers, brands, variants, images, and attachments.",
  },
  {
    label: "Template",
    title: "Start familiar scopes faster.",
    body: "Drop saved assemblies, then tune quantities and options.",
  },
  {
    label: "Revise",
    title: "Track the record.",
    body: "Activity, Node Activity, and row version history keep every change on the record.",
  },
  {
    label: "Share",
    title: "Send one proposal link.",
    body: "Comments, decisions, password protection, and .xlsx export stay attached.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <SectionShell
      id="how-it-works"
      label="How it works"
      eyebrow="Workflow"
      heading="From first line item to client approval, in one structured workspace."
    >
      <ol className="grid overflow-hidden rounded-landing-panel border border-landing-hairline-strong bg-landing-hairline lg:grid-cols-5">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="gsap-mechanic-card relative flex min-h-[320px] flex-col justify-end gap-[var(--landing-space-sm)] bg-surface p-[var(--landing-space-lg)]"
          >
            <span
              aria-hidden="true"
              className="absolute left-5 top-5 font-landing-display text-[clamp(3.5rem,6vw,7rem)] font-semibold leading-none text-landing-hairline-strong"
            >
              {step.label.slice(0, 1)}
            </span>
            <p className="relative z-10 font-numeric text-landing-text-label uppercase tracking-normal text-brand-orange-dark">
              {step.label}
            </p>
            <h3 className="relative z-10 font-landing-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
              {step.title}
            </h3>
            <p className="relative z-10 text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-[var(--landing-space-lg)] max-w-[var(--landing-measure-prose)] text-landing-text-body-sm leading-landing-prose text-landing-ink-muted">
        Your numbers come from your library and your inputs. Archestimator structures, stores, and totals them.
      </p>
    </SectionShell>
  );
}
