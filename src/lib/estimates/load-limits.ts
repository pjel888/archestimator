const productionEstimateSheetTreeLoadLimits = {
  maxNodeCount: 1500,
  maxRowItemCount: 5000,
} as const;

function readNonProductionE2ERowLimit() {
  if (process.env.NODE_ENV === "production") return null;
  const value = Number(process.env.ARCHESTIMATOR_E2E_ESTIMATE_TREE_ROW_LIMIT);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

export const ESTIMATE_SHEET_TREE_LOAD_LIMITS = {
  ...productionEstimateSheetTreeLoadLimits,
  maxRowItemCount: readNonProductionE2ERowLimit() ?? productionEstimateSheetTreeLoadLimits.maxRowItemCount,
} as const;
