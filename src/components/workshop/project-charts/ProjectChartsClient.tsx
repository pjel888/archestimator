"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useMemo, useState } from "react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { buildProjectChartSeries, getProjectChartDefaultPair } from "@/lib/project-charts/aggregate-project-charts";
import { buildProjectChartComparisonView } from "@/lib/project-charts/project-comparison-view";
import type { ProjectChartGroupingMode, ProjectChartsData } from "@/lib/project-charts/types";

import { ProjectComparisonHeader } from "./ProjectComparisonHeader";
import { ProjectComparisonTable } from "./ProjectComparisonTable";
import { ProjectCompositionBars } from "./ProjectCompositionBars";
import { ProjectVarianceSpine } from "./ProjectVarianceSpine";

// The donut is demoted to an optional single-estimate "Share view" and is now
// dynamic-imported so its d3-shape dependency only loads when that view is opened
// (`01` PERF-5, `08`). The default comparison views ship no d3 at all.
const ProjectCostDonutChart = dynamic(
  () => import("./ProjectCostDonutChart").then((module) => module.ProjectCostDonutChart),
  {
    loading: () => (
      <div
        className="flex min-h-[280px] items-center justify-center rounded-xs border border-dashed border-hairline text-[10px] text-muted-foreground"
        role="status"
        aria-label="Loading share view"
      >
        Loading share view
      </div>
    ),
  },
);

type ProjectChartsClientProps = {
  data: ProjectChartsData;
  initialLeftEstimateId: string | null;
  initialRightEstimateId: string | null;
  initialGroupingMode: ProjectChartGroupingMode;
};

type ChartViewMode = "variance" | "composition" | "share";

const MAX_CHART_COLUMNS = 3;
const GROUPING_OPTIONS = [
  { value: "space", label: "Space" },
  { value: "category", label: "Category" },
  { value: "supplier", label: "Supplier" },
] as const satisfies ReadonlyArray<{ value: ProjectChartGroupingMode; label: string }>;

const COMPARISON_TABLE_ID = "project-charts-comparison-table";

export function ProjectChartsClient({
  data,
  initialLeftEstimateId,
  initialRightEstimateId,
  initialGroupingMode,
}: ProjectChartsClientProps) {
  const defaultPair = getProjectChartDefaultPair(data.estimateOptions);
  const existingIds = useMemo(() => new Set(data.estimateOptions.map((estimate) => estimate.id)), [data.estimateOptions]);

  const [groupingMode, setGroupingMode] = useState<ProjectChartGroupingMode>(initialGroupingMode);
  const [selectedEstimateIds, setSelectedEstimateIds] = useState<string[]>(() => {
    const seed = [
      initialLeftEstimateId ?? defaultPair.leftEstimateId,
      initialRightEstimateId ?? defaultPair.rightEstimateId,
    ].filter((id): id is string => Boolean(id) && existingIds.has(id as string));
    return [...new Set(seed)].slice(0, MAX_CHART_COLUMNS);
  });
  const [baselineEstimateId, setBaselineEstimateId] = useState<string | null>(
    () => selectedEstimateIds[0] ?? null,
  );
  const [viewMode, setViewMode] = useState<ChartViewMode>(() =>
    selectedEstimateIds.length >= 2 ? "variance" : "composition",
  );
  const [hoverBucketId, setHoverBucketId] = useState<string | null>(null);
  const [pinnedBucketId, setPinnedBucketId] = useState<string | null>(null);

  // Keep the baseline pointed at a still-selected estimate.
  useEffect(() => {
    if (selectedEstimateIds.length === 0) return;
    if (!baselineEstimateId || !selectedEstimateIds.includes(baselineEstimateId)) {
      setBaselineEstimateId(selectedEstimateIds[0]);
    }
  }, [selectedEstimateIds, baselineEstimateId]);

  const view = useMemo(
    () =>
      buildProjectChartComparisonView({
        estimates: data.estimateOptions,
        rows: data.rowFacts,
        nodes: data.nodeFacts,
        categoryNodes: data.categoryNodeFacts,
        suppliers: data.supplierFacts,
        groupingMode,
        estimateIds: selectedEstimateIds,
        baselineEstimateId,
      }),
    [data, groupingMode, selectedEstimateIds, baselineEstimateId],
  );

  const hasComparison = Boolean(view.comparandEstimateId);
  const effectiveViewMode: ChartViewMode = !hasComparison && viewMode === "variance" ? "composition" : viewMode;
  const activeBucketId = pinnedBucketId ?? hoverBucketId;

  const shareEstimateId = baselineEstimateId ?? selectedEstimateIds[0] ?? null;
  const shareSeries = useMemo(
    () =>
      effectiveViewMode === "share" && shareEstimateId
        ? buildProjectChartSeries({
            estimates: data.estimateOptions,
            rows: data.rowFacts,
            nodes: data.nodeFacts,
            categoryNodes: data.categoryNodeFacts,
            suppliers: data.supplierFacts,
            groupingMode,
            estimateId: shareEstimateId,
          })
        : null,
    [effectiveViewMode, shareEstimateId, data, groupingMode],
  );

  const canAddEstimate = selectedEstimateIds.length < Math.min(MAX_CHART_COLUMNS, data.estimateOptions.length);

  function addEstimate() {
    const next = data.estimateOptions.find((estimate) => !selectedEstimateIds.includes(estimate.id));
    if (!next) return;
    setSelectedEstimateIds((current) => [...current, next.id].slice(0, MAX_CHART_COLUMNS));
  }

  function removeEstimate(estimateId: string) {
    setSelectedEstimateIds((current) => (current.length <= 1 ? current : current.filter((id) => id !== estimateId)));
  }

  function setActiveBucket(bucketId: string | null) {
    setHoverBucketId(bucketId);
  }

  function togglePin(bucketId: string) {
    setPinnedBucketId((current) => (current === bucketId ? null : bucketId));
  }

  const viewOptions = (hasComparison
    ? [
        { value: "variance", label: "Variance" },
        { value: "composition", label: "Composition" },
        { value: "share", label: "Share" },
      ]
    : [
        { value: "composition", label: "Composition" },
        { value: "share", label: "Share" },
      ]) as ReadonlyArray<{ value: ChartViewMode; label: string }>;

  const estimateSelectOptions = selectedEstimateIds
    .map((id) => data.estimateOptions.find((estimate) => estimate.id === id))
    .filter((estimate): estimate is NonNullable<typeof estimate> => Boolean(estimate))
    .map((estimate) => ({ value: estimate.id, label: estimate.name }));

  const showEmpty = data.estimateOptions.length === 0;

  return (
    <section data-project-charts-page className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 flex-col gap-2 border-b border-hairline px-3 py-2">
        <ProjectComparisonHeader view={view} projectName={data.projectName} />

        {!showEmpty ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="project-charts-controls">
            <ControlField label="Break down by">
              <SegmentedControl
                ariaLabel="Break down by"
                options={GROUPING_OPTIONS}
                value={groupingMode}
                onValueChange={setGroupingMode}
              />
            </ControlField>

            {selectedEstimateIds.length >= 2 ? (
              <ControlField label="Baseline">
                <DropdownSelect
                  aria-label="Baseline estimate"
                  options={estimateSelectOptions}
                  value={baselineEstimateId ?? undefined}
                  onValueChange={setBaselineEstimateId}
                />
              </ControlField>
            ) : null}

            <ControlField label="Estimates">
              <div className="flex flex-wrap items-center gap-1">
                {selectedEstimateIds.map((id) => {
                  const estimate = data.estimateOptions.find((option) => option.id === id);
                  if (!estimate) return null;
                  return (
                    <Chip
                      key={id}
                      active={id === baselineEstimateId}
                      removable={selectedEstimateIds.length > 1}
                      onRemove={() => removeEstimate(id)}
                      removeLabel={`Remove ${estimate.name}`}
                      onClick={() => setBaselineEstimateId(id)}
                    >
                      {estimate.name}
                    </Chip>
                  );
                })}
                {canAddEstimate ? (
                  <Button variant="outline" size="xs" onClick={addEstimate} className="min-w-0">
                    <Plus size={12} weight="regular" aria-hidden="true" />
                    Add estimate
                  </Button>
                ) : null}
              </div>
            </ControlField>

            <ControlField label="View">
              <SegmentedControl
                ariaLabel="Chart view"
                options={viewOptions}
                value={effectiveViewMode}
                onValueChange={(next) => setViewMode(next)}
              />
            </ControlField>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3" data-testid="project-charts-body">
        {showEmpty ? (
          <EmptyState
            title="No estimates yet"
            description="Create at least two estimates to compare project costs."
            action={<CreateEstimateLink projectId={data.projectId} />}
          />
        ) : (
          <>
            {data.requiresSelectedPair ? (
              <Banner
                tone="warning"
                title="Showing only the estimates you picked"
                description="This project is large, so totals are limited to the estimates selected above."
              />
            ) : null}

            {!hasComparison ? (
              <Banner
                tone="info"
                title="Add a second estimate to compare costs"
                description="A cost comparison needs at least two estimates. Showing this estimate on its own."
                actions={<CreateEstimateLink projectId={data.projectId} />}
              />
            ) : null}

            {effectiveViewMode === "variance" ? (
              <ProjectVarianceSpine
                view={view}
                tableId={COMPARISON_TABLE_ID}
                activeBucketId={activeBucketId}
                onActiveBucketChange={setActiveBucket}
                onTogglePin={togglePin}
              />
            ) : null}

            {effectiveViewMode === "composition" ? (
              <ProjectCompositionBars
                view={view}
                activeBucketId={activeBucketId}
                onActiveBucketChange={setActiveBucket}
                onTogglePin={togglePin}
              />
            ) : null}

            {effectiveViewMode === "share" && shareSeries ? (
              <section
                aria-label={`${shareSeries.estimateName} share of cost by ${groupingMode}. A data table with the same figures follows.`}
                aria-describedby={COMPARISON_TABLE_ID}
                className="rounded-xs border border-hairline bg-white p-3"
                data-testid="project-share-view"
              >
                <ProjectCostDonutChart
                  buckets={shareSeries.buckets}
                  currencyCode={view.currencyCode}
                  label={`${shareSeries.estimateName} ${groupingMode} cost distribution`}
                  total={shareSeries.total}
                  compact
                />
              </section>
            ) : null}

            {/* Secondary band: composition alongside the detail table when variance is primary. */}
            {effectiveViewMode === "variance" ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ProjectCompositionBars
                  view={view}
                  activeBucketId={activeBucketId}
                  onActiveBucketChange={setActiveBucket}
                  onTogglePin={togglePin}
                />
                <ProjectComparisonTable
                  view={view}
                  id={COMPARISON_TABLE_ID}
                  activeBucketId={activeBucketId}
                  onActiveBucketChange={setActiveBucket}
                  onTogglePin={togglePin}
                />
              </div>
            ) : (
              <ProjectComparisonTable
                view={view}
                id={COMPARISON_TABLE_ID}
                activeBucketId={activeBucketId}
                onActiveBucketChange={setActiveBucket}
                onTogglePin={togglePin}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ControlField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 text-[9px] font-medium uppercase tracking-normal text-tertiary">{label}</span>
      {children}
    </div>
  );
}

function CreateEstimateLink({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/workshop/projects/${projectId}/estimates`}
      className="inline-flex min-h-7 items-center gap-1 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none"
    >
      <Plus size={12} weight="regular" aria-hidden="true" />
      Create estimate
    </Link>
  );
}
