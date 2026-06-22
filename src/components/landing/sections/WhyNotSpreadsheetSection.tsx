import Link from "next/link";
import { SectionShell } from "./SectionShell";

/**
 * WhyNotSpreadsheetSection — homepage Section 8 (doc 02 §1, doc 05 §Section 8).
 *
 * The direct comparison to the status quo. The spreadsheet is the villain,
 * never the user (§10.2 #4). Rendered as a real <table> (doc 13 §2 — crawlable
 * comparison semantics). RSC.
 */
export function WhyNotSpreadsheetSection() {
  return (
    <SectionShell
      id="why-not-spreadsheet"
      label="Why not just a spreadsheet"
      eyebrow="Why not just a spreadsheet"
      heading="A spreadsheet resets every project."
      lead="A spreadsheet resets every project. You copy last time’s file, delete the rates, and rebuild. Archestimator keeps the knowledge: your prices, your suppliers, your revisions, building up as you work, so quoting gets faster and your numbers get easier to stand behind."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">
            How Archestimator compares to a spreadsheet for cost estimating.
          </caption>
          <thead>
            <tr className="border-b border-landing-hairline-strong">
              <th scope="col" className="py-[var(--landing-space-sm)] pr-[var(--landing-space-md)] align-bottom text-landing-text-body-sm font-medium text-landing-ink-muted">
                What changes
              </th>
              <th scope="col" className="py-[var(--landing-space-sm)] pr-[var(--landing-space-md)] align-bottom text-landing-text-body-sm font-medium text-landing-ink-muted">
                A spreadsheet
              </th>
              <th scope="col" className="py-[var(--landing-space-sm)] align-bottom text-landing-text-body-sm font-medium text-landing-ink">
                Archestimator
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-landing-hairline">
            {COMPARISON.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="py-[var(--landing-space-sm)] pr-[var(--landing-space-md)] align-top font-display text-landing-text-body leading-landing-tight text-landing-ink">
                  {row.label}
                </th>
                <td className="py-[var(--landing-space-sm)] pr-[var(--landing-space-md)] align-top text-landing-text-body-sm leading-landing-prose text-landing-ink-muted">
                  {row.spreadsheet}
                </td>
                <td className="py-[var(--landing-space-sm)] align-top text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                  {row.archestimator}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-[var(--landing-space-lg)] font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
        When every revision matters, spreadsheets are not enough.
      </p>
      <p className="mt-[var(--landing-space-sm)]">
        <Link
          href="/features"
          className="text-landing-text-body font-medium text-brand-orange-dark underline decoration-landing-hairline underline-offset-4 hover:decoration-brand-orange"
        >
          See every feature, with its status →
        </Link>
      </p>
    </SectionShell>
  );
}

const COMPARISON = [
  {
    label: "Pricing knowledge",
    spreadsheet: "Re-typed per project. Old rates deleted. The logic dies in the file.",
    archestimator: "Lives in your reusable component library and carries across every estimate.",
  },
  {
    label: "Revisions",
    spreadsheet: "Break the file. Hope the client didn’t keep the wrong version.",
    archestimator: "Activity, Node Activity, and row version history keep every change on the record.",
  },
  {
    label: "Proposal handoff",
    spreadsheet: "Email a copy. Feedback comes back in chat. Nobody holds the source of truth.",
    archestimator: "Share a single proposal link with comments, decisions, and password protection.",
  },
  {
    label: "Your suppliers + brands",
    spreadsheet: "Scattered across old files; rebuilt every time.",
    archestimator: "A structured library: brands, variants, pricing, images, attachments.",
  },
] as const;
