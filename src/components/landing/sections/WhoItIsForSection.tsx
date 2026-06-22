import { SectionShell } from "./SectionShell";

/**
 * WhoItIsForSection — homepage Section 6 (doc 02 §1, doc 05 §Section 6).
 *
 * Tiered AEC roles (§6.2), directed messages per role, NO logos (none exist;
 * §15 forbids inventing). The role names are real secondary-keyword surfaces
 * (doc 13 §2). RSC.
 */

const TIERS = [
  {
    tier: "Tier 1 · the wedge",
    roles: [
      {
        name: "Contractors & estimators",
        line: "Stop rebuilding your BOQ from scratch. Your unit costs, your suppliers, last project’s estimate — ready for the next one.",
      },
      {
        name: "Cost estimators & QS",
        line: "Every estimate you’ve costed should make the next one faster. Stop hunting old files for a rate you already set.",
      },
      {
        name: "Specialty & fit-out firms",
        line: "Same scopes, new project. Build from your library and send the cost proposal the same day.",
      },
      {
        name: "Architects",
        line: "Hand your client a cost proposal as resolved as your drawings, and defend every number when they ask.",
      },
    ],
  },
  {
    tier: "Tier 2 · expand",
    roles: [
      {
        name: "Engineers (civil / structural / MEP)",
        line: "Estimate the system once. Reuse it on every project after.",
      },
      {
        name: "Suppliers",
        line: "Turn your product list into a cost proposal in minutes, with the brands, variants, and unit costs your team reuses.",
      },
      {
        name: "Interior designers / design-build",
        line: "Specify it, cost it, send a proposal your client can approve, with every revision on the record.",
      },
    ],
  },
  {
    tier: "Tier 3 · the client side",
    roles: [
      {
        name: "Clients / owners / developers",
        line: "Control every cost proposal before it becomes a cost problem.",
      },
      {
        name: "Project managers / owner’s reps",
        line: "Stop chasing cost proposals across email threads. Every submission, revision, and approval in one place you control.",
      },
      {
        name: "Procurement / finance (client side)",
        line: "Review and compare cost proposals with the full revision history behind every number.",
      },
    ],
  },
] as const;

export function WhoItIsForSection() {
  return (
    <SectionShell
      id="who-it-is-for"
      label="Who it is for"
      eyebrow="Who it is for"
      heading="Built for the AEC teams enterprise tools overlook."
      lead="Architects, engineers, contractors, estimators and quantity surveyors, specialty and fit-out firms, interior designers, and suppliers — plus the clients and project managers who approve what they submit. If you build or approve cost estimates and cost proposals, Archestimator is for you."
    >
      <div className="flex flex-col gap-[var(--landing-space-xl)]">
        {TIERS.map((tierGroup) => (
          <div key={tierGroup.tier} className="flex flex-col gap-[var(--landing-space-md)]">
            <p className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
              {tierGroup.tier}
            </p>
            <ul className="grid gap-[var(--landing-space-md)] sm:grid-cols-2 lg:grid-cols-3">
              {tierGroup.roles.map((role) => (
                <li
                  key={role.name}
                  className="flex h-full flex-col gap-[var(--landing-space-2xs)] rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-md)]"
                >
                  <h3 className="font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
                    {role.name}
                  </h3>
                  <p className="text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                    {role.line}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-[var(--landing-space-lg)] max-w-[var(--landing-measure-prose)] text-landing-text-body-sm text-landing-ink-muted">
        The supplier catalog and quote-request layers are roadmap, so supplier messaging leans on
        the live component library. The client-side persistent archive is planned, so client
        messaging uses today’s live sharing, comments, decisions, and Activity as proof.
      </p>
    </SectionShell>
  );
}
