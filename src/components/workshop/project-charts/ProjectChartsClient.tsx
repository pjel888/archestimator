"use client";

import dynamic from "next/dynamic";
import { Plus, X } from "@phosphor-icons/react/dist/ssr";
import { useMemo, useState, type ReactNode } from "react";

import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { buildProjectChartSeries, getProjectChartDefaultPair } from "@/lib/project-charts/aggregate-project-charts";
import type { ProjectChartGroupingMode, ProjectChartsData } from "@/lib/project-charts/types";
import { cn } from "@/lib/ui/cn";

import { ProjectChartBucketTable } from "./ProjectChartBucketTable";
import { ProjectCostDonutChart } from "./ProjectCostDonutChart";

const ProjectCostBubbleChart = dynamic(() =>
  import("./ProjectCostBubbleChart").then((module) => module.ProjectCostBubbleChart),
  {
    loading: () => (
      <div
        className="flex min-h-[520px] items-center justify-center rounded-xs border border-dashed border-hairline text-[10px] text-muted-foreground"
        role="status"
        aria-label="Loading bubble chart"
      >
        Loading chart
      </div>
    ),
  },
);

type PreloadableChart = typeof ProjectCostBubbleChart & {
  preload?: () => Promise<unknown> | void;
};

type ProjectChartsClientProps = {
  data: ProjectChartsData;
  initialLeftEstimateId: string | null;
  initialRightEstimateId: string | null;
  initialGroupingMode: ProjectChartGroupingMode;
};

const GROUPING_OPTIONS: Array<{ value: ProjectChartGroupingMode; label: string }> = [
  { value: "space", label: "Space" },
  { value: "category", label: "Category" },
  { value: "supplier", label: "Suppliers" },
];

const CHART_VIEW_OPTIONS = [
  { value: "donut", label: "Donut Chart" },
  { value: "bubble", label: "Bubble Chart" },
] as const;

const MAX_CHART_COLUMNS = 3;
type ChartViewMode = (typeof CHART_VIEW_OPTIONS)[number]["value"];

export function ProjectChartsClient({
  data,
  initialLeftEstimateId,
  initialGroupingMode,
}: ProjectChartsClientProps) {
  const defaultPair = getProjectChartDefaultPair(data.estimateOptions);
  const [groupingMode, setGroupingMode] = useState<ProjectChartGroupingMode>(initialGroupingMode);
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("donut");
  const [chartEstimateIds, setChartEstimateIds] = useState(() =>
    [initialLeftEstimateId ?? defaultPair.leftEstimateId ?? data.estimateOptions[0]?.id].filter(Boolean) as string[],
  );
  const estimateOptions = data.estimateOptions.map((estimate) => ({
    value: estimate.id,
    label: estimate.name,
  }));
  const chartLimit = Math.min(MAX_CHART_COLUMNS, data.estimateOptions.length);
  const canAddChart = chartEstimateIds.length < chartLimit;

  const chartColumns = useMemo(
    () =>
      chartEstimateIds
        .map((estimateId) => {
          const estimate = data.estimateOptions.find((candidate) => candidate.id === estimateId);
          if (!estimate) return null;

          return {
            estimate,
            series: buildProjectChartSeries({
              estimates: data.estimateOptions,
              rows: data.rowFacts,
              nodes: data.nodeFacts,
              categoryNodes: data.categoryNodeFacts,
              suppliers: data.supplierFacts,
              groupingMode,
              estimateId,
            }),
          };
        })
        .filter(Boolean),
    [chartEstimateIds, data, groupingMode],
  );

  const bodyState = getBodyState(data);

  function addChart() {
    if (!canAddChart) return;

    const nextEstimate = data.estimateOptions.find((estimate) => !chartEstimateIds.includes(estimate.id)) ?? data.estimateOptions[0];
    if (!nextEstimate) return;

    setChartEstimateIds((current) => [...current, nextEstimate.id].slice(0, MAX_CHART_COLUMNS));
  }

  function updateChartEstimate(index: number, estimateId: string) {
    setChartEstimateIds((current) => current.map((id, currentIndex) => (currentIndex === index ? estimateId : id)));
  }

  function removeChart(index: number) {
    setChartEstimateIds((current) => (current.length <= 1 ? current : current.filter((_, currentIndex) => currentIndex !== index)));
  }

  function selectChartViewMode(nextMode: ChartViewMode) {
    if (nextMode === "bubble") {
      void (ProjectCostBubbleChart as PreloadableChart).preload?.();
    }
    setChartViewMode(nextMode);
  }

  return (
    <section data-project-charts-page className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline bg-white px-2 py-0">
        <div className="flex min-h-[38px] min-w-0 flex-1 flex-wrap items-center gap-2 py-1">
          <SegmentedToolbarLabel label="Group By">
            <div role="group" aria-label="Group chart costs by" className="grid grid-cols-3 gap-1 rounded-xs bg-surfaceMuted p-0.5">
              {GROUPING_OPTIONS.map((option) => (
                <SegmentedToolbarButton
                  key={option.value}
                  isActive={groupingMode === option.value}
                  label={option.label}
                  onClick={() => setGroupingMode(option.value)}
                />
              ))}
            </div>
          </SegmentedToolbarLabel>
          <SegmentedToolbarLabel label="View By">
            <div role="group" aria-label="Chart visualization type" className="grid grid-cols-2 gap-1 rounded-xs bg-surfaceMuted p-0.5">
              {CHART_VIEW_OPTIONS.map((option) => (
                <SegmentedToolbarButton
                  key={option.value}
                  isActive={chartViewMode === option.value}
                  label={option.label}
                  onClick={() => selectChartViewMode(option.value)}
                />
              ))}
            </div>
          </SegmentedToolbarLabel>
        </div>
        <HeaderIconToolbar
          ariaLabel="Project chart tools"
          labelPrefix="chart"
          showDefaultActions={false}
          addActions={[
            {
              label: "Add chart",
              visibleLabel: "Add chart",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              onClick: addChart,
              disabled: !canAddChart,
            },
          ]}
        />
        {data.requiresSelectedPair ? (
          <p className="basis-full px-1 pb-2 text-[10px] text-muted-foreground">
            Large project mode loads selected comparisons only.
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1">
        {bodyState ? (
          <EmptyState title={bodyState.title} description={bodyState.description} />
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, chartColumns.length)}, minmax(220px, 1fr))` }}
          >
            {chartColumns.map((column, index) => {
              if (!column) return null;
              const currencyCode = column.estimate.currencyCode ?? "PHP";

              return (
                <section
                  key={`${index}-${column.estimate.id}`}
                  className="min-w-0 overflow-hidden rounded-xs border border-hairline bg-white"
                  data-testid="project-chart-column"
                >
                  <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-hairline px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <DropdownSelect
                        aria-label={`Chart ${index + 1} estimate`}
                        data-testid={`chart-estimate-trigger-${index}`}
                        className="border-b-0 hover:border-transparent"
                        options={estimateOptions}
                        value={column.estimate.id}
                        onValueChange={(estimateId) => {
                          updateChartEstimate(index, estimateId);
                          // Committing remounts the column (its key carries the
                          // estimate id), which unmounts this trigger; re-find
                          // the replacement so keyboard users keep their place.
                          requestAnimationFrame(() => {
                            document
                              .querySelector<HTMLElement>(`[data-testid="chart-estimate-trigger-${index}"]`)
                              ?.focus();
                          });
                        }}
                      />
                    </div>
                    <p className="justify-self-center text-[10px] font-medium tabular-nums text-foreground" data-testid={`chart-${index + 1}-total`}>
                      {formatMoney(column.series.total, currencyCode)}
                    </p>
                    <div className="justify-self-end">
                      {chartColumns.length > 1 ? (
                        <Button
                          aria-label={`Remove chart ${index + 1}`}
                          className="size-6 rounded-xs"
                          onClick={() => removeChart(index)}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <X size={11} weight="regular" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {chartViewMode === "donut" ? (
                    <ProjectCostDonutChart
                      buckets={column.series.buckets}
                      currencyCode={currencyCode}
                      label={`${column.series.estimateName} ${groupingMode} cost distribution`}
                      total={column.series.total}
                    />
                  ) : (
                    <ProjectCostBubbleChart
                      buckets={column.series.buckets}
                      currencyCode={currencyCode}
                      label={`${column.series.estimateName} ${groupingMode} bubble cost distribution`}
                      total={column.series.total}
                    />
                  )}
                  <ProjectChartBucketTable currencyCode={currencyCode} groupingLabel={getGroupingLabel(groupingMode)} series={column.series} />
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function getBodyState(data: ProjectChartsData): { title: string; description: string } | null {
  if (data.estimateOptions.length === 0) {
    return {
      title: "No estimates yet",
      description: "Create at least two estimates before comparing project cost distributions.",
    };
  }

  return null;
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function getGroupingLabel(groupingMode: ProjectChartGroupingMode) {
  return GROUPING_OPTIONS.find((option) => option.value === groupingMode)?.label ?? "Group";
}

function SegmentedToolbarLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[9px] font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function SegmentedToolbarButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "h-6 rounded-xs px-2 text-[9px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
        isActive ? "bg-white text-ink shadow-sm" : "text-tertiary hover:bg-white/70 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
