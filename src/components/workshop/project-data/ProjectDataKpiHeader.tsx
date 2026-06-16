"use client";

import { FinancialTotalCard } from "@/components/ui/financial-total-card";
import type { ProjectChartBucket } from "@/lib/project-charts/types";
import { formatChartMoney } from "@/lib/project-charts/format";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";

type ProjectDataKpiHeaderProps = {
  selectedEstimate: ProjectDataEstimateSheet | null;
  sheetCount: number;
  topBucket: ProjectChartBucket | null;
};

export function ProjectDataKpiHeader({ selectedEstimate, sheetCount, topBucket }: ProjectDataKpiHeaderProps) {
  const currencyCode = selectedEstimate?.currencyCode ?? "PHP";
  return (
    <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Project data summary">
      <FinancialTotalCard
        label="Selected sheet total"
        value={formatChartMoney(selectedEstimate?.totalCost ?? 0, currencyCode)}
        sublabel={selectedEstimate?.name ?? "No estimate sheet selected"}
        variant="primary"
        className="p-3"
      />
      <FinancialTotalCard
        label="Estimate sheets"
        value={sheetCount}
        sublabel={sheetCount === 1 ? "One sheet in this project" : "Sheets in this project"}
        className="p-3"
      />
      {topBucket ? (
        <FinancialTotalCard
          label="Largest group"
          value={formatChartMoney(topBucket.total, currencyCode)}
          sublabel={topBucket.label}
          className="p-3"
        />
      ) : null}
    </div>
  );
}
