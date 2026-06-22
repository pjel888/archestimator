import { SectionShell } from "./SectionShell";

/**
 * WhatYouGetSection — homepage Section 4 (doc 02 §1, doc 05 §Section 4).
 *
 * Dense product mechanics grid. RSC.
 */

const MECHANICS = [
  {
    label: "Library",
    heading: "Stop starting from zero.",
    body: "Components, templates, suppliers, brands, variants, pricing, images, and attachments stay reusable.",
    className: "lg:col-span-7",
  },
  {
    label: "Tree",
    heading: "Estimate like the project is built.",
    body: "Groups, Areas, rows, rollups, and quantities stay in a structure your team can read.",
    className: "lg:col-span-5",
  },
  {
    label: "Record",
    heading: "Defend every change.",
    body: "Activity, Node Activity, and row history keep the revision trail attached to the work.",
    className: "lg:col-span-4",
  },
  {
    label: "Proposal",
    heading: "From estimate to approval.",
    body: "Publish one protected proposal link for comments, decisions, and client review.",
    className: "lg:col-span-4",
  },
  {
    label: "Compare",
    heading: "See cost movement.",
    body: "Project charts turn finished estimates into context for the next bid.",
    className: "lg:col-span-4",
  },
] as const;

export function WhatYouGetSection() {
  return (
    <SectionShell
      id="what-you-get"
      label="What you get"
      eyebrow="Product mechanics"
      heading="The estimate becomes a system."
      lead="Use the same workspace to price, revise, publish, and learn from the job."
    >
      <ol
        className="grid grid-flow-dense gap-2 lg:grid-cols-12"
        data-gpt-taste-dense-grid="true"
      >
        {MECHANICS.map((item) => (
          <li
            key={item.heading}
            className={`gsap-mechanic-card flex min-h-[230px] h-full flex-col justify-between gap-[var(--landing-space-lg)] rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-lg)] shadow-[inset_0_1px_rgba(255,255,255,0.7)] ${item.className}`}
          >
            <p className="font-numeric text-landing-text-label uppercase tracking-normal text-landing-ink-muted">
              {item.label}
            </p>
            <div className="flex flex-col gap-[var(--landing-space-sm)]">
              <h3 className="font-landing-display text-landing-text-title leading-landing-tight text-landing-ink">
                {item.heading}
              </h3>
              <p className="text-landing-text-body leading-landing-prose text-landing-ink-secondary">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-[var(--landing-space-md)] max-w-[var(--landing-measure-prose)] text-landing-text-body-sm text-landing-ink-muted">
        Proposal exports are editable working files. The shared proposal link stays the review surface.
      </p>
    </SectionShell>
  );
}
