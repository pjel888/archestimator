type ProjectTotalChangeDetail = {
  total: number;
};

type ProjectBudgetChangeDetail = {
  budget: number;
};

export type ProjectBudgetWindow = Window & {
  __archestimatorProjectBudget?: number;
  __archestimatorProjectTotal?: number;
  __archestimatorProjectEstimateMetadata?: { projectBudget?: unknown } | null;
};

export const PROJECT_TOTAL_CHANGE_EVENT = "archestimator:project-total-change";
export const PROJECT_BUDGET_CHANGE_EVENT = "archestimator:project-budget-change";

export function dispatchProjectTotalChange(total: number) {
  if (typeof window === "undefined") return;
  (window as ProjectBudgetWindow).__archestimatorProjectTotal = total;
  window.dispatchEvent(new CustomEvent<ProjectTotalChangeDetail>(PROJECT_TOTAL_CHANGE_EVENT, { detail: { total } }));
}

export function dispatchProjectBudgetChange(budget: number) {
  if (typeof window === "undefined") return;
  (window as ProjectBudgetWindow).__archestimatorProjectBudget = budget;
  window.dispatchEvent(new CustomEvent<ProjectBudgetChangeDetail>(PROJECT_BUDGET_CHANGE_EVENT, { detail: { budget } }));
}
