"use client";

import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { CostConcentration } from "@/lib/project-charts/build-concentration-sentence";
import { formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

const GROUPING_OPTIONS: Array<{ value: ProjectChartGroupingMode; label: string }> = [
  { value: "category", label: "Category" },
  { value: "supplier", label: "Supplier" },
  { value: "space", label: "Space" },
];

const NOUN_PLURAL_CAP: Record<ProjectChartGroupingMode, string> = {
  category: "Categories",
  supplier: "Suppliers",
  space: "Areas",
};

type ProjectDataInsightHeaderProps = {
  className?: string;
  estimateSheets: ProjectDataEstimateSheet[];
  selectedEstimate: ProjectDataEstimateSheet | null;
  groupingMode: ProjectChartGroupingMode;
  concentration: CostConcentration | null;
  sheetCount: number;
  didTruncate: boolean;
  rowLimit: number;
  onEstimateChange: (estimateId: string) => void;
  onGroupingModeChange: (mode: ProjectChartGroupingMode) => void;
};

export function ProjectDataInsightHeader({
  className,
  estimateSheets,
  selectedEstimate,
  groupingMode,
  concentration,
  sheetCount,
  didTruncate,
  rowLimit,
  onEstimateChange,
  onGroupingModeChange,
}: ProjectDataInsightHeaderProps) {
  const currencyCode = selectedEstimate?.currencyCode ?? "PHP";
  const sheetOptions: DropdownSelectOption[] = estimateSheets.map((estimate) => ({
    value: estimate.id,
    label: estimate.sheetCode ? `${estimate.name} (${estimate.sheetCode})` : estimate.name,
  }));
  const hasInsight = Boolean(selectedEstimate && concentration && (selectedEstimate.totalCost ?? 0) > 0);

  return (
    <section
      aria-label="Sheet focus"
      className={cn("min-h-0 overflow-visible rounded-xs p-3", className)}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 self-start">
          <p className="text-[9px] font-medium uppercase tracking-normal text-secondary">Cost data</p>
          <p className="mt-0.5 text-[10px] leading-4 text-secondary">
            {sheetCount === 1 ? "One estimate sheet in this project" : `${sheetCount} estimate sheets in this project`}
          </p>
        </div>
        <div className="relative z-10 flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <DropdownSelect
            aria-label="Estimate sheet"
            options={sheetOptions}
            value={selectedEstimate?.id ?? ""}
            onValueChange={onEstimateChange}
            placeholder="No estimate sheets"
            disabled={sheetOptions.length === 0}
            variant="boxed"
            className="h-7 w-full min-w-0 text-[10px] sm:w-[220px]"
          />
          <SegmentedControl
            ariaLabel="Group cost by"
            options={GROUPING_OPTIONS}
            value={groupingMode}
            onValueChange={onGroupingModeChange}
            className="w-full min-w-0 sm:w-[216px]"
          />
        </div>

        {hasInsight && concentration && selectedEstimate ? (
          <p className="max-w-[68ch] text-balance text-[12px] font-medium leading-5 text-ink lg:col-span-2">
            {concentration.sentence}
          </p>
        ) : null}

        {hasInsight && concentration && selectedEstimate ? (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-hairline bg-hairline sm:grid-cols-4 lg:col-span-2">
            <Figure label="Sheet total" value={formatChartMoney(selectedEstimate.totalCost, currencyCode)} />
            <Figure label="Top-2 share" value={formatChartShare(concentration.topTwoShare)} />
            <Figure
              label={`${NOUN_PLURAL_CAP[groupingMode]} to 80%`}
              value={String(concentration.groupsCarrying80)}
            />
            <Figure label="Line items" value={concentration.lineCount.toLocaleString("en-PH")} />
          </dl>
        ) : null}

        {hasInsight && didTruncate ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xs border border-warning/25 bg-warningSoft px-2 py-1.5 text-warning lg:col-span-2"
          >
            <WarningCircle size={13} weight="regular" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-[10px] leading-4">
              <span className="font-medium">Partial coverage</span>: capped at{" "}
              {rowLimit.toLocaleString("en-PH")} rows; totals and mix may be incomplete.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-white px-3 py-2">
      <dt className="text-[9px] font-medium uppercase tracking-normal text-secondary">{label}</dt>
      <dd className="text-[12px] font-medium tabular-nums leading-tight text-ink">{value}</dd>
    </div>
  );
}
