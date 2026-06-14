import Link from "next/link";
import type { ReactNode } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatChartMoney, formatChartShare, formatSignedChartMoney } from "@/lib/project-charts/format";
import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";
import { buildCompareHref, buildEstimateSheetHref } from "@/lib/workshop/compare-href";
import type { DashboardCostRollup, DashboardEstimateSheet } from "@/lib/workshop/dashboard-types";

type DashboardWorkSummaryProps = {
  projectId: string;
  selectedEstimate: DashboardEstimateSheet;
  estimateCount: number;
  rollup: DashboardCostRollup;
  groupingMode: ProjectChartGroupingMode;
};

export function DashboardWorkSummary({
  projectId,
  selectedEstimate,
  estimateCount,
  rollup,
  groupingMode,
}: DashboardWorkSummaryProps) {
  const variance = selectedEstimate.variance;
  const estimateHref = buildEstimateSheetHref(projectId, selectedEstimate.id, selectedEstimate.firstNodeId);

  return (
    <section aria-label="Project work summary" className="flex flex-col gap-2 rounded-xs border border-hairline bg-white p-3">
      <SectionHeading
        aside={
          <StatusBadge
            status={selectedEstimate.isIncludedInProposal ? "active" : "draft"}
            className="min-w-0 px-1.5 py-1"
          >
            {selectedEstimate.isIncludedInProposal ? "In proposal" : "Not in proposal"}
          </StatusBadge>
        }
      >
        Project cockpit
      </SectionHeading>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0">
          <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Selected estimate</p>
          <p className="truncate text-[12px] font-medium leading-4 text-ink">{selectedEstimate.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] leading-3 text-secondary">
            <span>{selectedEstimate.sheetCode ?? "No sheet code"}</span>
            <span>{selectedEstimate.rowCount} {selectedEstimate.rowCount === 1 ? "row" : "rows"}</span>
            <span>{selectedEstimate.nodeCount} {selectedEstimate.nodeCount === 1 ? "space" : "spaces"}</span>
          </div>
        </div>

        <div className="min-w-0 text-left md:text-right">
          <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Selected total</p>
          <p className="text-[12px] font-medium leading-4 tabular-nums text-ink">
            {formatChartMoney(selectedEstimate.total, selectedEstimate.currencyCode)}
          </p>
          <p className="mt-1 text-[9px] leading-3 text-secondary">{formatEstimateDate(selectedEstimate.updatedAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-hairline pt-2 md:grid-cols-3">
        <SummaryFact label="Budget">
          {selectedEstimate.budget && selectedEstimate.budget > 0
            ? formatChartMoney(selectedEstimate.budget, selectedEstimate.currencyCode)
            : "No budget set"}
        </SummaryFact>
        <SummaryFact label="Variance">
          {variance
            ? `${formatSignedChartMoney(variance.delta, selectedEstimate.currencyCode)} (${formatChartShare(variance.percent)})`
            : "Not calculated"}
        </SummaryFact>
        <SummaryFact label="Project total">
          {rollup.kind === "single-currency"
            ? `${formatChartMoney(rollup.total, rollup.currencyCode)} across ${estimateCount}`
            : "Hidden for mixed currencies"}
        </SummaryFact>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-2">
        <SummaryLink href={estimateHref}>Open estimate sheet</SummaryLink>
        <SummaryLink href={buildCompareHref(projectId, [selectedEstimate.id], groupingMode)}>Compare breakdown</SummaryLink>
      </div>
    </section>
  );
}

function SummaryFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">{label}</p>
      <p className="truncate text-[10px] font-medium leading-3 text-ink">{children}</p>
    </div>
  );
}

function SummaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xs text-[9px] font-medium text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
    </Link>
  );
}

function formatEstimateDate(value: string | null): string {
  if (!value) return "No update date";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
