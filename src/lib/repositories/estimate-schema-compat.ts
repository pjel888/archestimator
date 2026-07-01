import type { EstimateRow } from "@/lib/types/database";

export type EstimateRecordWithLegacy = Omit<EstimateRow, "notes" | "project_budget" | "sheet_code"> & {
  notes?: string | null;
  project_budget?: number | null;
  sheet_code?: string | null;
  revision_label?: string | null;
};

type MissingColumnErrorCandidate = {
  code?: string | null;
  message?: string | null;
};

export function isMissingColumnError(error: MissingColumnErrorCandidate | null | undefined, column: string) {
  const message = error?.message?.toLowerCase() ?? "";
  const missingColumnCodes = error?.code === "42703" || error?.code === "PGRST204";
  return missingColumnCodes && message.includes(column.toLowerCase());
}

export function isMissingRelationError(error: MissingColumnErrorCandidate | null | undefined, relation: string) {
  const message = error?.message?.toLowerCase() ?? "";
  const missingRelationCodes = error?.code === "42P01" || error?.code === "PGRST205";
  return missingRelationCodes && message.includes(relation.toLowerCase());
}

export function normalizeEstimateRecord(estimate: EstimateRecordWithLegacy): EstimateRow {
  const { notes, project_budget: projectBudget, revision_label: legacyRevisionLabel, sheet_code: sheetCode, ...rest } = estimate;

  return {
    ...rest,
    notes: notes ?? null,
    project_budget: projectBudget ?? null,
    sheet_code: sheetCode ?? legacyRevisionLabel ?? "Rev 0",
  } as EstimateRow;
}
