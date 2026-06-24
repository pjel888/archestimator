import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

import type { ProjectEstimateTableRow } from "./types";

const budgetInputFormatter = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function makeOptimisticEstimateId() {
  return `temp-${crypto.randomUUID()}`;
}

export function getEstimateHref(estimate: ProjectEstimateTableRow) {
  return estimate.firstNodeId
    ? `/workshop/projects/${estimate.project_id}/estimates/${estimate.firstNodeId}`
    : `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`;
}

export function formatBudgetInput(value: number | null) {
  if (typeof value !== "number") return "";
  return budgetInputFormatter.format(value);
}

export function parseBudgetInput(value: string) {
  const text = value.replace(/,/g, "").trim();
  if (!text) return null;

  const budget = Number(text);
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Project budget must be a valid positive number.");
  return budget;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Update failed. Please try again.";
}

export function patchEstimateIfCurrent(
  store: ProjectEstimatesStore,
  estimateId: string,
  expected: Partial<ProjectEstimateTableRow>,
  patch: Partial<ProjectEstimateTableRow>,
) {
  const current = store.getState().estimates.find((estimate) => estimate.id === estimateId);
  if (!current) return false;

  const stillOwnsOptimisticValue = (Object.entries(expected) as [keyof ProjectEstimateTableRow, ProjectEstimateTableRow[keyof ProjectEstimateTableRow]][])
    .every(([key, value]) => current[key] === value);
  if (!stillOwnsOptimisticValue) return false;

  store.getState().patch(estimateId, patch);
  return true;
}
