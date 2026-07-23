import { ClientPortalFinancialSection } from "@/components/client-portal/ClientPortalFinancialSection";
import type { ClientPortalCostBreakdownPayload } from "@/lib/client-portal/financial-sections";

import styles from "../kimi-landing.module.css";

const DEMONSTRATION_PAYLOAD = {
  schemaVersion: 1,
  currencyCode: "PHP",
  groupBy: "area",
  includeCharts: true,
  totalCost: 3_284_000,
  totalCostMinorUnits: 328_400_000,
  buckets: [
    {
      id: "area:kitchen-and-dining",
      label: "Kitchen and dining",
      totalCost: 1_126_000,
      totalCostMinorUnits: 112_600_000,
    },
    {
      id: "area:primary-suite",
      label: "Primary suite",
      totalCost: 842_000,
      totalCostMinorUnits: 84_200_000,
    },
    {
      id: "area:living-areas",
      label: "Living areas",
      totalCost: 736_000,
      totalCostMinorUnits: 73_600_000,
    },
    {
      id: "area:external-works",
      label: "External works",
      totalCost: 580_000,
      totalCostMinorUnits: 58_000_000,
    },
  ],
} satisfies ClientPortalCostBreakdownPayload;

export function ProposalOutputProof() {
  return (
    <div className={styles.currentProductProof}>
      <div className={styles.currentProductProofInner}>
        <ClientPortalFinancialSection
          kind="cost_breakdown"
          payload={DEMONSTRATION_PAYLOAD}
        />
      </div>
    </div>
  );
}
