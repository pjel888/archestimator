export const ESTIMATE_ROW_REVISION_CONFLICT_CODE = "estimate_sheet_row_revision_conflict";

export class EstimateRowRevisionConflictError extends Error {
  code = ESTIMATE_ROW_REVISION_CONFLICT_CODE;

  constructor() {
    super("This row changed elsewhere. Reload the estimate and review the latest row before saving again.");
    this.name = "EstimateRowRevisionConflictError";
  }
}

export function isEstimateRowRevisionConflict(error: unknown) {
  const record = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  return record.code === ESTIMATE_ROW_REVISION_CONFLICT_CODE
    || (typeof record.message === "string" && record.message.includes(ESTIMATE_ROW_REVISION_CONFLICT_CODE));
}
