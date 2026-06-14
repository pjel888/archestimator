import Link from "next/link";
import type { ReactNode } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatChartMoney } from "@/lib/project-charts/format";
import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";
import { formatRelativeTime } from "@/lib/util/relative-time";
import { buildCompareHref, buildEstimateSheetHref } from "@/lib/workshop/compare-href";
import type { DashboardEstimateSheet } from "@/lib/workshop/dashboard-types";

/**
 * Zone C: a lean, read-only list of recent estimate sheets with one-click
 * deep-links. It includes the selected estimate, so a one-sheet project still
 * has a useful navigation row. No cross-row sum here, so mixed currencies are
 * safe.
 */
const MAX_VISIBLE_ROWS = 6;

type DashboardEstimateListProps = {
  projectId: string;
  selectedEstimateId: string;
  selectedGroupingMode: ProjectChartGroupingMode;
  estimateSheets: DashboardEstimateSheet[];
  totalEstimateCount: number;
};

export function DashboardEstimateList({
  projectId,
  selectedEstimateId,
  selectedGroupingMode,
  estimateSheets,
  totalEstimateCount,
}: DashboardEstimateListProps) {
  if (estimateSheets.length === 0) return null;

  const visible = estimateSheets.slice(0, MAX_VISIBLE_ROWS);
  const hasMore = estimateSheets.length > MAX_VISIBLE_ROWS;

  return (
    <section aria-label="Recent estimate sheets" className="flex flex-col gap-2 rounded-xs border border-hairline bg-white p-3">
      <SectionHeading
        aside={
          hasMore ? (
            <Link
              href={`/workshop/projects/${projectId}/estimates`}
              className="rounded-xs text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              View all {totalEstimateCount}
            </Link>
          ) : undefined
        }
      >
        Recent estimate sheets
      </SectionHeading>

      <ul className="flex flex-col">
        {visible.map((estimate) => {
          const compareIds = estimate.id === selectedEstimateId ? [selectedEstimateId] : [selectedEstimateId, estimate.id];
          return (
            <li
              key={estimate.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 border-t border-hairline py-1.5 text-[10px] first:border-t-0"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-medium text-ink">{estimate.name}</span>
                  {estimate.isSelected ? (
                    <StatusBadge status="active" className="min-w-0 px-1.5 py-1">
                      Selected
                    </StatusBadge>
                  ) : null}
                  {estimate.isIncludedInProposal ? (
                    <StatusBadge status="approved" className="min-w-0 px-1.5 py-1">
                      Proposal
                    </StatusBadge>
                  ) : null}
                  {estimate.variance?.isOver ? (
                    <StatusBadge status="danger" className="min-w-0 px-1.5 py-1">
                      Over
                    </StatusBadge>
                  ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] leading-3 text-secondary">
                  <span>{estimate.sheetCode ?? "No code"}</span>
                  <span>
                    {estimate.rowCount} {estimate.rowCount === 1 ? "row" : "rows"}
                  </span>
                  <span>{formatRelativeTime(estimate.updatedAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="shrink-0 tabular-nums text-secondary">
                  {formatChartMoney(estimate.total, estimate.currencyCode)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <EstimateRowLink href={buildEstimateSheetHref(projectId, estimate.id, estimate.firstNodeId)}>
                    Open {estimate.name}
                  </EstimateRowLink>
                  <EstimateRowLink href={buildCompareHref(projectId, compareIds, selectedGroupingMode)}>
                    Compare {estimate.name}
                  </EstimateRowLink>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EstimateRowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xs text-[9px] font-medium text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
    </Link>
  );
}
