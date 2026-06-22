import { SectionShell } from "./SectionShell";

/**
 * ClaimsLedgerSection — homepage Section 7 (doc 02 §1, doc 05 §Section 7).
 *
 * The radical-honesty proof engine. The interactive ClaimsLedger component
 * (built by the claims-ledger lane) is dropped in as `children` by page.tsx,
 * so this section is the copy frame. One of the two hydrating leaves on the
 * page (the ledger filter). RSC.
 */
export interface ClaimsLedgerSectionProps {
  /** The ClaimsLedger RSC (interactive filter island inside). */
  children?: React.ReactNode;
}

export function ClaimsLedgerSection({ children }: ClaimsLedgerSectionProps) {
  return (
    <SectionShell
      id="what-is-real"
      label="What is real today"
      eyebrow="What is real today"
      heading="We would rather tell you exactly what it does today than oversell it."
      lead="Every claim below carries a status. Live ships today. Building is partial and improving. Planned is on the roadmap, not yet shipped. This is part of how we work."
    >
      {children}
    </SectionShell>
  );
}
