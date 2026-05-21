"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

export const PROJECT_TOTAL_CHANGE_EVENT = "archestimator:project-total-change";
export const PROJECT_BUDGET_CHANGE_EVENT = "archestimator:project-budget-change";

type ProjectTotalChangeDetail = {
  total: number;
};

type ProjectBudgetChangeDetail = {
  budget: number;
};

export function dispatchProjectTotalChange(total: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProjectTotalChangeDetail>(PROJECT_TOTAL_CHANGE_EVENT, { detail: { total } }));
}

export function dispatchProjectBudgetChange(budget: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProjectBudgetChangeDetail>(PROJECT_BUDGET_CHANGE_EVENT, { detail: { budget } }));
}

export function ProjectTotalHeader({ plannedBudget = 0, projectId }: { plannedBudget?: number; projectId?: string }) {
  const pathname = usePathname();
  const isEstimateSheetRoute = projectId
    ? Boolean(pathname?.startsWith(`/workshop/projects/${projectId}/estimates/`))
    : true;
  const [budget, setBudget] = useState(plannedBudget);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isEstimateSheetRoute) return;

    function handleProjectTotalChange(event: Event) {
      const customEvent = event as CustomEvent<ProjectTotalChangeDetail>;
      if (typeof customEvent.detail?.total === "number") setTotal(customEvent.detail.total);
    }

    window.addEventListener(PROJECT_TOTAL_CHANGE_EVENT, handleProjectTotalChange);
    return () => window.removeEventListener(PROJECT_TOTAL_CHANGE_EVENT, handleProjectTotalChange);
  }, [isEstimateSheetRoute]);

  useEffect(() => {
    if (!isEstimateSheetRoute) return;

    function handleProjectBudgetChange(event: Event) {
      const customEvent = event as CustomEvent<ProjectBudgetChangeDetail>;
      if (typeof customEvent.detail?.budget === "number") setBudget(customEvent.detail.budget);
    }

    window.addEventListener(PROJECT_BUDGET_CHANGE_EVENT, handleProjectBudgetChange);
    return () => window.removeEventListener(PROJECT_BUDGET_CHANGE_EVENT, handleProjectBudgetChange);
  }, [isEstimateSheetRoute]);

  if (!isEstimateSheetRoute) return null;

  return (
    <div
      className="mx-px flex h-full w-[calc(100%-2px)] items-center justify-between bg-white px-2"
      data-estimate-center-column="project-total-header"
      aria-label="Sheet running totals"
    >
      <div className="flex w-fit flex-col items-start justify-center text-left">
        <span className="font-mono text-[12px] font-bold leading-4 tabular-nums text-ink">{formatPeso(budget)}</span>
        <span className="text-[6px] font-bold uppercase leading-3 tracking-[0.12em] text-gray-400">Planned project budget</span>
      </div>
      <div className="flex w-fit flex-col items-end justify-center">
        <span className="font-mono text-[12px] font-bold leading-4 tabular-nums text-ink">{formatPeso(total)}</span>
        <span className="text-[6px] font-bold uppercase leading-3 tracking-[0.12em] text-gray-400">Ongoing total project cost</span>
      </div>
    </div>
  );
}
