import type { ProjectChartEstimateSeries, ProjectChartGroupingMode } from "@/lib/project-charts/types";

/**
 * View-model contract between the dashboard server assembler
 * (`project-dashboard-repository.ts`) and the client `<main>` zones. Everything
 * here is safe to cross the wire: pre-bucketed series and totals only, no raw
 * row/node facts.
 */

export type DashboardVariance = {
  /** The headline estimate's `project_budget`. */
  budget: number;
  /** total minus budget (positive = over budget). */
  delta: number;
  /** delta / budget (e.g. 0.12 = 12% over). */
  percent: number;
  isOver: boolean;
};

export type DashboardHeadline = {
  id: string;
  name: string;
  total: number;
  currencyCode: string;
  updatedAt: string | null;
  /** Per-estimate budget; null when none is set (no fabricated zero, R3). */
  budget: number | null;
  /** Present only when a positive budget exists (R3). */
  variance: DashboardVariance | null;
};

export type DashboardOtherEstimate = {
  id: string;
  name: string;
  total: number;
  currencyCode: string;
  updatedAt: string | null;
  /** Deep-link target for "open" (the estimate's first node); null when empty. */
  firstNodeId: string | null;
  overBudget: boolean;
};

export type DashboardEstimateSheet = {
  id: string;
  name: string;
  sheetCode: string | null;
  total: number;
  currencyCode: string;
  updatedAt: string | null;
  rowCount: number;
  nodeCount: number;
  firstNodeId: string | null;
  budget: number | null;
  variance: DashboardVariance | null;
  isSelected: boolean;
  isIncludedInProposal: boolean;
};

/**
 * Cross-estimate rollup is meaningful only under one shared currency (KTD-4 / R9);
 * otherwise it degrades to a `mixed` marker the UI renders as a caption.
 */
export type DashboardCostRollup =
  | { kind: "single-currency"; total: number; currencyCode: string }
  | { kind: "mixed" };

export type DashboardCostMix = {
  /** Pre-bucketed series for the selected estimate (space / category / supplier). */
  series: ProjectChartEstimateSeries;
  currencyCode: string;
  /** True when row/node loads hit the per-estimate cap, so figures may be partial. */
  truncated: boolean;
};

export type DashboardReadinessItemStatus =
  | "ready"
  | "needs-setup"
  | "needs-refresh"
  | "live"
  | "expired"
  | "revoked"
  | "manual-send"
  | "info";

export type DashboardReadinessItem = {
  id: string;
  label: string;
  detail: string;
  status: DashboardReadinessItemStatus;
  actionLabel?: string;
  href?: string;
};

export type DashboardReadiness = {
  status: "ready" | "needs-setup" | "needs-refresh" | "expired" | "revoked";
  primaryAction: {
    label: string;
    href: string;
  };
  exportItems: DashboardReadinessItem[];
  shareItems: DashboardReadinessItem[];
};

export type DashboardRisk = {
  id: string;
  label: string;
  detail: string;
  severity: "info" | "warning" | "danger";
  actionLabel?: string;
  href?: string;
};

export type ProjectDashboardSummary = {
  projectId: string;
  estimateCount: number;
  selectedEstimateId: string | null;
  selectedGroupingMode: ProjectChartGroupingMode;
  /** Selected estimate, defaulting to the most recently updated sheet. */
  selectedEstimate: DashboardEstimateSheet | null;
  /** Recent estimate sheets, including the selected estimate. */
  estimateSheets: DashboardEstimateSheet[];
  /** Legacy alias retained while older dashboard tests/components are migrated. */
  headline: DashboardHeadline | null;
  /** Selected-estimate cost composition for the donut + breakdown table; null when empty. */
  costMix: DashboardCostMix | null;
  /** Legacy list shape retained while older dashboard tests/components are migrated. */
  otherEstimates: DashboardOtherEstimate[];
  readiness: DashboardReadiness | null;
  risks: DashboardRisk[];
  rollup: DashboardCostRollup;
};
