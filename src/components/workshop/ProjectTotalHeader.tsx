"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

const compactPesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 2,
});

function formatCompactPeso(value: number) {
  return compactPesoFormatter.format(value).replace("₱", "₱ ");
}

export const PROJECT_TOTAL_CHANGE_EVENT = "archestimator:project-total-change";
export const PROJECT_BUDGET_CHANGE_EVENT = "archestimator:project-budget-change";

type ProjectTotalChangeDetail = {
  total: number;
};

type ProjectBudgetChangeDetail = {
  budget: number;
};

type ProjectBudgetWindow = Window & {
  __archestimatorProjectBudget?: number;
  __archestimatorProjectEstimateMetadata?: { projectBudget?: unknown } | null;
};

export function dispatchProjectTotalChange(total: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProjectTotalChangeDetail>(PROJECT_TOTAL_CHANGE_EVENT, { detail: { total } }));
}

export function dispatchProjectBudgetChange(budget: number) {
  if (typeof window === "undefined") return;
  (window as ProjectBudgetWindow).__archestimatorProjectBudget = budget;
  window.dispatchEvent(new CustomEvent<ProjectBudgetChangeDetail>(PROJECT_BUDGET_CHANGE_EVENT, { detail: { budget } }));
}

const BUDGET_WARNING_THRESHOLD_PERCENT = 85;

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatTrackPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(2)}%`;
}

function getActiveEstimateProjectBudget(fallback: number) {
  if (typeof window === "undefined") return fallback;

  const projectBudgetWindow = window as ProjectBudgetWindow;
  const storedBudget = projectBudgetWindow.__archestimatorProjectBudget;

  if (typeof storedBudget === "number") return storedBudget;

  const metadata = projectBudgetWindow.__archestimatorProjectEstimateMetadata;

  if (!metadata || !("projectBudget" in metadata)) return fallback;

  return typeof metadata.projectBudget === "number" ? metadata.projectBudget : 0;
}

function subscribeToProjectBudgetChange(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PROJECT_BUDGET_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(PROJECT_BUDGET_CHANGE_EVENT, onStoreChange);
}

function subscribeToInactiveProjectBudgetChange() {
  return () => {};
}

function useProjectBudget(plannedBudget: number, isEstimateSheetRoute: boolean) {
  return useSyncExternalStore(
    isEstimateSheetRoute ? subscribeToProjectBudgetChange : subscribeToInactiveProjectBudgetChange,
    () => (isEstimateSheetRoute ? getActiveEstimateProjectBudget(plannedBudget) : plannedBudget),
    () => plannedBudget,
  );
}

type BudgetHealthState = "missing" | "empty" | "success" | "warning" | "danger";

const BUDGET_HEALTH_BUDGET_BLUE_TEXT_CLASS = "text-[#3F7FBF]";
const BUDGET_HEALTH_BUDGET_BLUE_FILL_CLASS = "bg-[#A7C7F2]";
const BUDGET_HEALTH_BUDGET_BLUE_TICK_CLASS = "bg-[#5D93CF]";
const BUDGET_HEALTH_OVERBUDGET_RED_TEXT_CLASS = "text-[#C86161]";
const BUDGET_HEALTH_OVERBUDGET_RED_FILL_CLASS = "bg-[#F1A7A7]";

function getBudgetHealthState(usagePercent: number, hasBudget: boolean, total: number): BudgetHealthState {
  if (!hasBudget) return "missing";
  if (total <= 0) return "empty";
  if (usagePercent > 100) return "danger";
  if (usagePercent >= BUDGET_WARNING_THRESHOLD_PERCENT) return "warning";
  return "success";
}

function budgetHealthTextClass(state: BudgetHealthState) {
  if (state === "danger") return BUDGET_HEALTH_OVERBUDGET_RED_TEXT_CLASS;
  if (state === "warning" || state === "success") return BUDGET_HEALTH_BUDGET_BLUE_TEXT_CLASS;
  return "text-tertiary";
}

function budgetHealthFillClass(state: BudgetHealthState) {
  if (state === "success" || state === "warning" || state === "danger") return BUDGET_HEALTH_BUDGET_BLUE_FILL_CLASS;
  return "bg-divider";
}

function budgetHealthTotalValueClass(state: BudgetHealthState) {
  if (state === "danger") return BUDGET_HEALTH_OVERBUDGET_RED_TEXT_CLASS;
  if (state === "warning") return BUDGET_HEALTH_BUDGET_BLUE_TEXT_CLASS;
  return "text-ink";
}

function BudgetHealthMeter({ budget, total }: { budget: number; total: number }) {
  const safeBudget = Math.max(0, budget);
  const safeTotal = Math.max(0, total);
  const hasBudget = safeBudget > 0;
  const usagePercent = hasBudget ? (safeTotal / safeBudget) * 100 : 0;
  const state = getBudgetHealthState(usagePercent, hasBudget, safeTotal);
  const scaleMax = hasBudget ? Math.max(safeBudget, safeTotal, 1) : Math.max(safeTotal, 1);
  const budgetTickPercent = hasBudget ? (safeBudget / scaleMax) * 100 : 100;
  const inBudgetFillPercent = hasBudget ? (Math.min(safeTotal, safeBudget) / scaleMax) * 100 : 0;
  const overBudgetFillPercent = hasBudget && safeTotal > safeBudget ? ((safeTotal - safeBudget) / scaleMax) * 100 : 0;
  const remaining = safeBudget - safeTotal;
  const fullStatusText = !hasBudget
    ? "Add planned budget to track variance"
    : safeTotal <= 0
      ? "No estimate cost yet"
      : remaining < 0
        ? `${formatPeso(Math.abs(remaining))} over · ${formatPercent(usagePercent)} used`
        : `${formatPeso(remaining)} remaining · ${formatPercent(usagePercent)} used`;
  const summaryText = !hasBudget
    ? fullStatusText
    : safeTotal <= 0
      ? fullStatusText
      : remaining < 0
        ? `${formatCompactPeso(Math.abs(remaining))} over · ${formatPercent(usagePercent)} used`
        : `${formatCompactPeso(remaining)} remaining · ${formatPercent(usagePercent)} used`;
  const shortStatusText = !hasBudget ? "No budget" : `${formatPercent(usagePercent)} used`;
  const textClassName = budgetHealthTextClass(state);
  const fillClassName = budgetHealthFillClass(state);
  const meterValue = Math.round(usagePercent);
  const meterMax = Math.max(100, meterValue);

  return (
    <div className="flex min-w-[112px] flex-1 flex-col justify-center" data-budget-health-state={state}>
      <div className="mb-0.5 flex items-center justify-between gap-2 text-[8px] font-medium uppercase leading-3 tracking-normal text-gray-400">
        <span>Budget health</span>
        <span className={textClassName}>{shortStatusText}</span>
      </div>
      <div
        className="relative h-1.5 overflow-hidden rounded-xs bg-surfaceMuted"
        role="meter"
        aria-label="Budget health"
        aria-valuemin={0}
        aria-valuemax={meterMax}
        aria-valuenow={meterValue}
        aria-valuetext={fullStatusText}
        data-budget-health-meter
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-xs ${fillClassName}`}
          style={{ width: formatTrackPercent(inBudgetFillPercent) }}
          data-budget-health-fill
        />
        {overBudgetFillPercent > 0 ? (
          <span
            className={`absolute inset-y-0 rounded-xs ${BUDGET_HEALTH_OVERBUDGET_RED_FILL_CLASS}`}
            style={{ left: formatTrackPercent(budgetTickPercent), width: formatTrackPercent(overBudgetFillPercent) }}
            data-budget-health-overflow
          />
        ) : null}
        {hasBudget ? (
          <span
            className={`absolute -top-0.5 h-2.5 w-px ${BUDGET_HEALTH_BUDGET_BLUE_TICK_CLASS} shadow-[0_0_0_1px_rgba(255,255,255,0.8)]`}
            style={{ left: formatTrackPercent(budgetTickPercent) }}
            data-budget-health-budget-tick
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className={`mt-0.5 truncate text-center text-[8px] font-medium leading-[10px] ${textClassName}`} data-budget-health-summary>
        {summaryText}
      </p>
    </div>
  );
}

export function ProjectTotalHeader({ plannedBudget = 0, projectId }: { plannedBudget?: number; projectId?: string }) {
  const pathname = usePathname();
  const isEstimateSheetRoute = projectId
    ? Boolean(pathname?.startsWith(`/workshop/projects/${projectId}/estimates/`))
    : true;
  const budget = useProjectBudget(plannedBudget, isEstimateSheetRoute);
  const [total, setTotal] = useState(0);
  const healthState = getBudgetHealthState(budget > 0 ? (Math.max(0, total) / Math.max(0, budget)) * 100 : 0, budget > 0, Math.max(0, total));
  const totalValueClassName = budgetHealthTotalValueClass(healthState);

  useEffect(() => {
    if (!isEstimateSheetRoute) return;

    function handleProjectTotalChange(event: Event) {
      const customEvent = event as CustomEvent<ProjectTotalChangeDetail>;
      if (typeof customEvent.detail?.total === "number") setTotal(customEvent.detail.total);
    }

    window.addEventListener(PROJECT_TOTAL_CHANGE_EVENT, handleProjectTotalChange);
    return () => window.removeEventListener(PROJECT_TOTAL_CHANGE_EVENT, handleProjectTotalChange);
  }, [isEstimateSheetRoute]);

  if (!isEstimateSheetRoute) return null;

  return (
    <div
      className="mx-px flex h-full w-[calc(100%-2px)] items-center gap-2 px-2"
      data-estimate-center-column="project-total-header"
      aria-label="Estimate running totals"
    >
      <div className="flex min-w-[118px] shrink-0 flex-col items-start justify-center text-left">
        <span className={`font-sans text-[12px] font-medium leading-4 tabular-nums ${BUDGET_HEALTH_BUDGET_BLUE_TEXT_CLASS}`}>{formatPeso(budget)}</span>
        <span className="text-[8px] font-medium uppercase leading-3 tracking-normal text-gray-400">Project budget</span>
      </div>
      <BudgetHealthMeter budget={budget} total={total} />
      <div className="flex min-w-[138px] shrink-0 flex-col items-end justify-center">
        <span className={`font-sans text-[12px] font-medium leading-4 tabular-nums ${totalValueClassName}`}>{formatPeso(total)}</span>
        <span className="text-right text-[8px] font-medium uppercase leading-3 tracking-normal text-gray-400">Ongoing project cost</span>
      </div>
    </div>
  );
}

// The estimate workspace is liquid-glass: its root insets the three floating
// panes by 8px (root `gap-2 p-2`, marginless panes), so the floated centre paper
// shifts inward ~8px on both edges. The running-totals bar adds that inset so it
// tracks the centre paper instead of drifting and reading as "cut off". These are
// the same CSS vars the centre-column boundary uses, kept in sync via calc().
const PROJECT_TOTAL_FOOTER_OFFSET = {
  left: "calc(var(--estimate-tree-panel-width) + var(--workshop-page-shell-padding) + 8px)",
  right: "calc(var(--estimate-library-panel-width) + var(--workshop-page-shell-padding) + 8px)",
} as const;

/**
 * Absolutely-positioned running-totals overlay that lives in the workshop shell
 * footer. It aligns under the floated centre paper of the glass estimate
 * workspace (the live, and only, estimate surface). It lives at the shell layer —
 * a sibling of the EstimateSurfaceVariant provider rather than a descendant — so
 * it can't read that context; the offset is fixed to the glass inset instead.
 */
export function ProjectTotalFooterOverlay({ projectId }: { projectId: string }) {
  return (
    <div
      className="absolute inset-y-0 flex items-center"
      style={PROJECT_TOTAL_FOOTER_OFFSET}
      data-estimate-center-column="project-total-footer"
      data-estimate-surface="glass"
      aria-label="Estimate running totals"
    >
      <ProjectTotalHeader projectId={projectId} />
    </div>
  );
}
