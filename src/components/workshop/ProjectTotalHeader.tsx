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
const BUDGET_HEALTH_SUCCESS_TEXT_CLASS = "text-[#3F7FBF]";
const BUDGET_HEALTH_WARNING_TEXT_CLASS = "text-[#9A6A1F]";
const BUDGET_HEALTH_OVERBUDGET_RED_TEXT_CLASS = "text-[#C86161]";
const BUDGET_HEALTH_SEGMENT_COUNT = 144;
const BUDGET_HEALTH_SEGMENT_CLASSES = {
  inactive: "bg-[#E7E9EC]",
} as const;

const BUDGET_HEALTH_GRADIENT_STOPS = [
  { at: 0, color: "#5A95E8", tone: "blue" },
  { at: 0.12, color: "#55ACEF", tone: "sky" },
  { at: 0.24, color: "#4EC6E8", tone: "cyan" },
  { at: 0.36, color: "#57D5C0", tone: "teal" },
  { at: 0.48, color: "#73D98C", tone: "green" },
  { at: 0.6, color: "#B8DC6E", tone: "lime" },
  { at: 0.72, color: "#E1CD66", tone: "yellow" },
  { at: 0.82, color: "#E8AA5F", tone: "amber" },
  { at: 0.92, color: "#E77F60", tone: "orange" },
  { at: 1, color: "#D96565", tone: "red" },
] as const;

function getBudgetHealthState(usagePercent: number, hasBudget: boolean, total: number): BudgetHealthState {
  if (!hasBudget) return "missing";
  if (total <= 0) return "empty";
  if (usagePercent > 100) return "danger";
  if (usagePercent >= BUDGET_WARNING_THRESHOLD_PERCENT) return "warning";
  return "success";
}

function budgetHealthTextClass(state: BudgetHealthState) {
  if (state === "danger") return BUDGET_HEALTH_OVERBUDGET_RED_TEXT_CLASS;
  if (state === "warning") return BUDGET_HEALTH_WARNING_TEXT_CLASS;
  if (state === "success") return BUDGET_HEALTH_SUCCESS_TEXT_CLASS;
  return "text-tertiary";
}

function budgetHealthTotalValueClass(state: BudgetHealthState) {
  if (state === "danger") return BUDGET_HEALTH_OVERBUDGET_RED_TEXT_CLASS;
  if (state === "warning") return BUDGET_HEALTH_WARNING_TEXT_CLASS;
  return "text-ink";
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function interpolateHexColor(from: string, to: string, amount: number) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);

  return rgbToHex({
    r: Math.round(start.r + (end.r - start.r) * amount),
    g: Math.round(start.g + (end.g - start.g) * amount),
    b: Math.round(start.b + (end.b - start.b) * amount),
  });
}

function getBudgetHealthGradientStop(ratioToBudget: number) {
  const clampedRatio = Math.min(1, Math.max(0, ratioToBudget));

  for (let index = 1; index < BUDGET_HEALTH_GRADIENT_STOPS.length; index += 1) {
    const previousStop = BUDGET_HEALTH_GRADIENT_STOPS[index - 1];
    const nextStop = BUDGET_HEALTH_GRADIENT_STOPS[index];

    if (clampedRatio <= nextStop.at) {
      const localAmount = (clampedRatio - previousStop.at) / (nextStop.at - previousStop.at);
      return {
        color: interpolateHexColor(previousStop.color, nextStop.color, localAmount),
        tone: nextStop.tone,
      };
    }
  }

  return BUDGET_HEALTH_GRADIENT_STOPS[BUDGET_HEALTH_GRADIENT_STOPS.length - 1];
}

function BudgetHealthMeter({ budget, total }: { budget: number; total: number }) {
  const safeBudget = Math.max(0, budget);
  const safeTotal = Math.max(0, total);
  const hasBudget = safeBudget > 0;
  const usagePercent = hasBudget ? (safeTotal / safeBudget) * 100 : 0;
  const state = getBudgetHealthState(usagePercent, hasBudget, safeTotal);
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
  const meterValue = Math.round(usagePercent);
  const meterMax = Math.max(100, meterValue);
  const activeSegmentCount =
    hasBudget && safeTotal > 0
      ? Math.min(BUDGET_HEALTH_SEGMENT_COUNT, Math.ceil((usagePercent / 100) * BUDGET_HEALTH_SEGMENT_COUNT))
      : 0;
  const segments = Array.from({ length: BUDGET_HEALTH_SEGMENT_COUNT }, (_, index) => {
    const isActive = index < activeSegmentCount;
    const gradientStop = isActive ? getBudgetHealthGradientStop((index + 1) / BUDGET_HEALTH_SEGMENT_COUNT) : null;
    return { index, isActive, color: gradientStop?.color, tone: gradientStop?.tone ?? "inactive" };
  });

  return (
    <div className="flex min-w-[112px] flex-1 flex-col justify-center" data-budget-health-state={state}>
      <div className="mb-0.5 flex items-center justify-between gap-2 text-[8px] font-medium uppercase leading-3 tracking-normal text-gray-400">
        <span>Budget health</span>
        <span className={textClassName}>{shortStatusText}</span>
      </div>
      <div
        className="flex h-1.5 items-center gap-px overflow-hidden"
        role="meter"
        aria-label="Budget health"
        aria-valuemin={0}
        aria-valuemax={meterMax}
        aria-valuenow={meterValue}
        aria-valuetext={fullStatusText}
        data-budget-health-meter
      >
        {segments.map((segment) => (
          <span
            key={segment.index}
            className={`block aspect-square h-1.5 min-h-1.5 w-1.5 min-w-1.5 shrink-0 rounded-[1px] ${
              segment.isActive ? "" : BUDGET_HEALTH_SEGMENT_CLASSES.inactive
            }`}
            style={segment.color ? { backgroundColor: segment.color } : undefined}
            data-budget-health-segment
            data-budget-health-segment-active={segment.isActive ? "true" : "false"}
            data-budget-health-segment-tone={segment.tone}
            data-budget-health-segment-color={segment.color}
            aria-hidden="true"
          />
        ))}
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
