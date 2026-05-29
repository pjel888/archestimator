"use client";

/**
 * Re-export wrapper for backward compatibility.
 * Real implementation lives in the shared @/components/charts/CostDonutChart
 * (extracted during P1 of Share Page Estimate View Enhancement).
 *
 * Zero behavioral change for workshop charts.
 */
export { CostDonutChart as ProjectCostDonutChart } from "@/components/charts/CostDonutChart";

// Maintain old type name for any direct imports in the workshop area
export type { CostBucket as ProjectChartBucket } from "@/lib/charts/types";

// The rest of the file is intentionally removed — the shared component
// is the source of truth. All prior tests and usage continue to work.
