import { ClientPortalFinancialSection } from "@/components/client-portal/ClientPortalFinancialSection";
import type { ClientPortalCostBreakdownPayload } from "@/lib/client-portal/financial-sections";
import styles from "./new-landing.module.css";

const SANITIZED_PROPOSAL_COST_BREAKDOWN = {
  schemaVersion: 1,
  currencyCode: "PHP",
  groupBy: "category",
  includeCharts: true,
  buckets: [
    {
      id: "sanitized-structural-works",
      label: "Structural works",
      totalCost: 1_850_000,
      totalCostMinorUnits: 185_000_000,
    },
    {
      id: "sanitized-architectural-finishes",
      label: "Architectural finishes",
      totalCost: 1_225_000,
      totalCostMinorUnits: 122_500_000,
    },
    {
      id: "sanitized-building-services",
      label: "Building services",
      totalCost: 750_000,
      totalCostMinorUnits: 75_000_000,
    },
    {
      id: "sanitized-site-preparation",
      label: "Site preparation",
      totalCost: 425_000,
      totalCostMinorUnits: 42_500_000,
    },
  ],
  totalCost: 4_250_000,
  totalCostMinorUnits: 425_000_000,
} satisfies ClientPortalCostBreakdownPayload;

export function LandingProposalProof() {
  return (
    <figure className={styles.proposalProof}>
      <figcaption className={styles.proposalProofCaption}>
        <span className={styles.proposalProofCaptionLabel}>Current issued proposal financial view</span>
        <span className={styles.proposalProofCaptionNote}>Sanitized demonstration data</span>
      </figcaption>
      <div className={styles.proposalProofSurface}>
        <ClientPortalFinancialSection kind="cost_breakdown" payload={SANITIZED_PROPOSAL_COST_BREAKDOWN} />
      </div>
    </figure>
  );
}
