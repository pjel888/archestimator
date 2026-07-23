"use client";

import { ArrowDown, ArrowUp, Equals } from "@phosphor-icons/react/dist/ssr";

import { buildInsightSentence } from "@/lib/project-charts/build-insight-sentence";
import type { ProjectChartComparisonView } from "@/lib/project-charts/project-comparison-view";
import { formatChartMoney } from "@/lib/project-charts/format";
import { cn } from "@/lib/ui/cn";

type ProjectComparisonHeaderProps = {
  view: ProjectChartComparisonView;
  projectName: string;
};

const GROUPING_NOUN: Record<string, string> = {
  space: "space",
  category: "category",
  supplier: "supplier",
};

/**
 * Header band (`08` band 1): the page's entry point and verdict. A real `<h1>`
 * ("{Project} · Cost comparison"), a currency chip, a subtitle naming exactly what
 * is being compared, and the auto-generated insight sentence — the product's heart
 * (`03` UX-1/UX-4). The insight is driven entirely by the view-model + the pure
 * `buildInsightSentence`, never re-derived here.
 */
export function ProjectComparisonHeader({ view, projectName }: ProjectComparisonHeaderProps) {
  const insight = buildInsightSentence(view.insight);
  const baseline = view.estimates.find((estimate) => estimate.isBaseline) ?? view.estimates[0] ?? null;
  const comparand = view.estimates.find((estimate) => estimate.id === view.comparandEstimateId) ?? null;

  const subtitle = comparand
    ? `Comparing ${baseline?.name ?? "—"} (${formatChartMoney(baseline?.total ?? 0, view.currencyCode)}) vs ${comparand.name} (${formatChartMoney(comparand.total, view.currencyCode)}) · grouped by ${GROUPING_NOUN[view.groupingMode] ?? view.groupingMode}`
    : baseline
      ? `Showing ${baseline.name} (${formatChartMoney(baseline.total, view.currencyCode)}) · grouped by ${GROUPING_NOUN[view.groupingMode] ?? view.groupingMode}`
      : `Grouped by ${GROUPING_NOUN[view.groupingMode] ?? view.groupingMode}`;

  const accentClass =
    insight?.direction === "lower" ? "text-success" : insight?.direction === "higher" ? "text-danger" : "text-foreground";
  const InsightIcon =
    insight?.direction === "lower" ? ArrowDown : insight?.direction === "higher" ? ArrowUp : Equals;

  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-[12px] font-medium leading-tight text-foreground">
            <span className="text-tertiary">{projectName} · </span>Cost comparison
          </h1>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{subtitle}</p>
        </div>
        <span className="shrink-0 rounded-xs border border-hairline bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-normal text-tertiary">
          {view.currencyCode}
        </span>
      </div>

      {insight ? (
        <div
          data-testid="project-charts-insight"
          className="flex items-start gap-1.5 rounded-xs border border-hairline bg-surfaceMuted/60 px-2.5 py-2"
        >
          <InsightIcon size={16} weight="regular" aria-hidden="true" className={cn("mt-px shrink-0", accentClass)} />
          <p className="text-[11px] leading-snug text-foreground">{insight.sentence}</p>
        </div>
      ) : null}
    </header>
  );
}
