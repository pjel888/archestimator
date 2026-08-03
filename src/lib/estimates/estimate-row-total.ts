/**
 * The canonical, dependency-free calculation oracle for estimate rows.
 *
 * Consumers use the typed helpers so invalid or unsafe inputs cannot become an
 * output total.
 */
export const ESTIMATE_CALCULATION_VERSION = 1;
export const ESTIMATE_CALCULATION_CURRENCY_SCALE = 2;

const QUANTITY_SCALE = 1_000_000;
const MINOR_UNIT_FACTOR = 100;
const MIN_ADJUSTMENT_PERCENTAGE = -100;
const MAX_ADJUSTMENT_PERCENTAGE = 1_000;
const MAX_PROPOSAL_PERCENTAGE = 100;

const supportedCurrencies = new Set(["AUD", "CAD", "EUR", "GBP", "HKD", "NZD", "PHP", "SGD", "USD"]);

export type EstimateCalculationErrorCode = "invalid_calculation_input" | "amount_out_of_range" | "unsupported_currency";

export type EstimateCalculationFailure = {
  ok: false;
  code: EstimateCalculationErrorCode;
  field: string;
};

export type EstimateCalculationSuccess<T> = {
  ok: true;
  value: T;
};

export type EstimateCalculationResult<T> = EstimateCalculationSuccess<T> | EstimateCalculationFailure;

export type EstimateRowCostInput = {
  quantity: number | string | null;
  quantity_base?: number | string | null;
  quantity_contingency_amount?: number | string | null;
  unit_cost: number | string | null;
  material_rate?: number | string | null;
  contingency_percentage?: number | string | null;
  adjustment_percentage?: number | string | null;
  misc_cost: number | string | null;
  currency_code?: string | null;
  scope_status?: "included" | "excluded" | "by_owner" | null;
  archived?: boolean | null;
};

export type EstimateCalculationInput = EstimateRowCostInput & {
  currency_code?: string | null;
};

export type EstimateRowCostParts = {
  calculationVersion: typeof ESTIMATE_CALCULATION_VERSION;
  currencyCode: string;
  currencyScale: typeof ESTIMATE_CALCULATION_CURRENCY_SCALE;
  quantity: number;
  materialMinorUnits: number;
  adjustmentMinorUnits: number;
  miscMinorUnits: number;
  totalMinorUnits: number;
  total: number;
};

export type EstimateTotalBasis = "working_estimate" | "proposal_included_direct" | "final_proposal";

export type EstimateTotals = {
  basis: EstimateTotalBasis;
  currencyCode: string;
  currencyScale: typeof ESTIMATE_CALCULATION_CURRENCY_SCALE;
  rowTotalMinorUnits: number;
  sheetAdjustmentMinorUnits: number;
  proposalContingencyMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  total: number;
};

export type EstimateTotalsOptions = {
  currencyCode?: string | null;
  sheetAdjustmentPercentage?: number | string | null;
  proposalContingencyPercentage?: number | string | null;
  vatPercentage?: number | string | null;
};

function failure(code: EstimateCalculationErrorCode, field: string): EstimateCalculationFailure {
  return { ok: false, code, field };
}

function parseOptionalNumber(value: number | string | null | undefined, field: string): EstimateCalculationResult<number> {
  if (value === null || value === undefined) return { ok: true, value: 0 };
  if (typeof value === "string" && value.trim() === "") return failure("invalid_calculation_input", field);

  const parsed = Number(value);
  return Number.isFinite(parsed) ? { ok: true, value: parsed } : failure("invalid_calculation_input", field);
}

function parseNonNegative(value: number | string | null | undefined, field: string): EstimateCalculationResult<number> {
  const parsed = parseOptionalNumber(value, field);
  if (!parsed.ok) return parsed;
  return parsed.value >= 0 ? parsed : failure("invalid_calculation_input", field);
}

function parsePercentage(
  value: number | string | null | undefined,
  field: string,
  minimum: number,
  maximum: number,
): EstimateCalculationResult<number> {
  const parsed = parseOptionalNumber(value, field);
  if (!parsed.ok) return parsed;
  return parsed.value >= minimum && parsed.value <= maximum ? parsed : failure("invalid_calculation_input", field);
}

function normalizeQuantity(value: number): EstimateCalculationResult<number> {
  const scaled = value * QUANTITY_SCALE;
  if (!Number.isSafeInteger(Math.round(scaled))) return failure("amount_out_of_range", "quantity");

  const normalized = Math.round(scaled) / QUANTITY_SCALE;
  return Number.isSafeInteger(Math.round(normalized * QUANTITY_SCALE)) ? { ok: true, value: normalized } : failure("amount_out_of_range", "quantity");
}

function toMinorUnits(amount: number, field: string): EstimateCalculationResult<number> {
  const scaled = amount * MINOR_UNIT_FACTOR;
  if (!Number.isFinite(scaled) || Math.abs(scaled) > Number.MAX_SAFE_INTEGER) return failure("amount_out_of_range", field);

  const rounded = scaled < 0 ? -Math.round(Math.abs(scaled)) : Math.round(scaled);
  return Number.isSafeInteger(rounded) ? { ok: true, value: rounded } : failure("amount_out_of_range", field);
}

function checkedAdd(left: number, right: number, field: string): EstimateCalculationResult<number> {
  const total = left + right;
  return Number.isSafeInteger(total) ? { ok: true, value: total } : failure("amount_out_of_range", field);
}

function normalizeCurrency(value: string | null | undefined): EstimateCalculationResult<string> {
  const currencyCode = (value ?? "PHP").trim().toUpperCase();
  return supportedCurrencies.has(currencyCode) ? { ok: true, value: currencyCode } : failure("unsupported_currency", "currency_code");
}

function validateQuantityContingency(
  quantity: number,
  quantityBase: number | string | null | undefined,
  quantityContingencyAmount: number | string | null | undefined,
): EstimateCalculationResult<void> {
  if (quantityBase === null || quantityBase === undefined) return { ok: true, value: undefined };

  const base = parseNonNegative(quantityBase, "quantity_base");
  if (!base.ok) return base;
  const contingency = parseOptionalNumber(quantityContingencyAmount, "quantity_contingency_amount");
  if (!contingency.ok) return contingency;

  const effectiveQuantity = normalizeQuantity(Math.max(0, base.value + contingency.value));
  if (!effectiveQuantity.ok) return effectiveQuantity;
  return effectiveQuantity.value === quantity ? { ok: true, value: undefined } : failure("invalid_calculation_input", "quantity_contingency_amount");
}

/** Validates the closed number domain before a mutation or output operation. */
export function validateEstimateCalculationInput(input: EstimateCalculationInput): EstimateCalculationResult<{
  quantity: number;
  materialRate: number;
  miscCost: number;
  adjustmentPercentage: number;
  currencyCode: string;
}> {
  const quantity = parseNonNegative(input.quantity, "quantity");
  if (!quantity.ok) return quantity;
  const normalizedQuantity = normalizeQuantity(quantity.value);
  if (!normalizedQuantity.ok) return normalizedQuantity;
  const quantityContingency = validateQuantityContingency(normalizedQuantity.value, input.quantity_base, input.quantity_contingency_amount);
  if (!quantityContingency.ok) return quantityContingency;

  const materialRate = parseNonNegative(input.material_rate ?? input.unit_cost, "unit_cost");
  if (!materialRate.ok) return materialRate;
  const miscCost = parseNonNegative(input.misc_cost, "misc_cost");
  if (!miscCost.ok) return miscCost;
  const adjustmentPercentage = parsePercentage(
    input.adjustment_percentage ?? (input.quantity_base === null || input.quantity_base === undefined ? input.contingency_percentage : 0),
    "adjustment_percentage",
    MIN_ADJUSTMENT_PERCENTAGE,
    MAX_ADJUSTMENT_PERCENTAGE,
  );
  if (!adjustmentPercentage.ok) return adjustmentPercentage;
  const currencyCode = normalizeCurrency(input.currency_code);
  if (!currencyCode.ok) return currencyCode;

  return {
    ok: true,
    value: {
      quantity: normalizedQuantity.value,
      materialRate: materialRate.value,
      miscCost: miscCost.value,
      adjustmentPercentage: adjustmentPercentage.value,
      currencyCode: currencyCode.value,
    },
  };
}

/** Computes independently rounded canonical row cost parts. */
export function computeEstimateRowCostParts(input: EstimateCalculationInput): EstimateCalculationResult<EstimateRowCostParts> {
  const validated = validateEstimateCalculationInput(input);
  if (!validated.ok) return validated;

  const { quantity, materialRate, miscCost, adjustmentPercentage, currencyCode } = validated.value;
  const material = toMinorUnits(quantity * materialRate, "material");
  if (!material.ok) return material;
  const adjustment = toMinorUnits((material.value / MINOR_UNIT_FACTOR) * (adjustmentPercentage / 100), "adjustment");
  if (!adjustment.ok) return adjustment;
  const misc = toMinorUnits(miscCost, "misc_cost");
  if (!misc.ok) return misc;
  const withAdjustment = checkedAdd(material.value, adjustment.value, "row_total");
  if (!withAdjustment.ok) return withAdjustment;
  const total = checkedAdd(withAdjustment.value, misc.value, "row_total");
  if (!total.ok) return total;

  return {
    ok: true,
    value: {
      calculationVersion: ESTIMATE_CALCULATION_VERSION,
      currencyCode,
      currencyScale: ESTIMATE_CALCULATION_CURRENCY_SCALE,
      quantity,
      materialMinorUnits: material.value,
      adjustmentMinorUnits: adjustment.value,
      miscMinorUnits: misc.value,
      totalMinorUnits: total.value,
      total: total.value / MINOR_UNIT_FACTOR,
    },
  };
}

export function applySheetAdjustment(
  subtotalMinorUnits: number,
  percentage: number | string | null | undefined,
): EstimateCalculationResult<{ adjustmentMinorUnits: number; totalMinorUnits: number }> {
  if (!Number.isSafeInteger(subtotalMinorUnits)) return failure("amount_out_of_range", "sheet_subtotal");
  const adjustmentPercentage = parsePercentage(percentage, "sheet_adjustment_percentage", MIN_ADJUSTMENT_PERCENTAGE, MAX_ADJUSTMENT_PERCENTAGE);
  if (!adjustmentPercentage.ok) return adjustmentPercentage;
  const adjustment = toMinorUnits((subtotalMinorUnits / MINOR_UNIT_FACTOR) * (adjustmentPercentage.value / 100), "sheet_adjustment");
  if (!adjustment.ok) return adjustment;
  const total = checkedAdd(subtotalMinorUnits, adjustment.value, "sheet_total");
  if (!total.ok) return total;
  return { ok: true, value: { adjustmentMinorUnits: adjustment.value, totalMinorUnits: total.value } };
}

export function applyProposalCharges(
  directMinorUnits: number,
  proposalContingencyPercentage: number | string | null | undefined,
  vatPercentage: number | string | null | undefined,
): EstimateCalculationResult<{ proposalContingencyMinorUnits: number; vatMinorUnits: number; totalMinorUnits: number }> {
  if (!Number.isSafeInteger(directMinorUnits)) return failure("amount_out_of_range", "proposal_direct_total");
  const contingencyPercentage = parsePercentage(proposalContingencyPercentage, "proposal_contingency_percentage", 0, MAX_PROPOSAL_PERCENTAGE);
  if (!contingencyPercentage.ok) return contingencyPercentage;
  const vat = parsePercentage(vatPercentage, "vat_percentage", 0, MAX_PROPOSAL_PERCENTAGE);
  if (!vat.ok) return vat;
  const contingency = toMinorUnits((directMinorUnits / MINOR_UNIT_FACTOR) * (contingencyPercentage.value / 100), "proposal_contingency");
  if (!contingency.ok) return contingency;
  const withContingency = checkedAdd(directMinorUnits, contingency.value, "proposal_total");
  if (!withContingency.ok) return withContingency;
  const vatAmount = toMinorUnits((withContingency.value / MINOR_UNIT_FACTOR) * (vat.value / 100), "vat");
  if (!vatAmount.ok) return vatAmount;
  const total = checkedAdd(withContingency.value, vatAmount.value, "proposal_total");
  if (!total.ok) return total;
  return { ok: true, value: { proposalContingencyMinorUnits: contingency.value, vatMinorUnits: vatAmount.value, totalMinorUnits: total.value } };
}

export function computeEstimateTotals(
  rows: readonly EstimateRowCostInput[],
  basis: EstimateTotalBasis,
  options: EstimateTotalsOptions = {},
): EstimateCalculationResult<EstimateTotals> {
  const currency = normalizeCurrency(options.currencyCode);
  if (!currency.ok) return currency;

  let rowTotalMinorUnits = 0;
  for (const row of rows) {
    if (row.archived || (basis !== "working_estimate" && row.scope_status && row.scope_status !== "included")) continue;
    const costParts = computeEstimateRowCostParts({ ...row, currency_code: row.currency_code ?? currency.value });
    if (!costParts.ok) return costParts;
    if (costParts.value.currencyCode !== currency.value) return failure("unsupported_currency", "mixed_currency");
    const total = checkedAdd(rowTotalMinorUnits, costParts.value.totalMinorUnits, "aggregate_total");
    if (!total.ok) return total;
    rowTotalMinorUnits = total.value;
  }

  const sheet = applySheetAdjustment(rowTotalMinorUnits, options.sheetAdjustmentPercentage);
  if (!sheet.ok) return sheet;
  const charges = basis === "final_proposal"
    ? applyProposalCharges(sheet.value.totalMinorUnits, options.proposalContingencyPercentage, options.vatPercentage)
    : { ok: true as const, value: { proposalContingencyMinorUnits: 0, vatMinorUnits: 0, totalMinorUnits: sheet.value.totalMinorUnits } };
  if (!charges.ok) return charges;

  return {
    ok: true,
    value: {
      basis,
      currencyCode: currency.value,
      currencyScale: ESTIMATE_CALCULATION_CURRENCY_SCALE,
      rowTotalMinorUnits,
      sheetAdjustmentMinorUnits: sheet.value.adjustmentMinorUnits,
      proposalContingencyMinorUnits: charges.value.proposalContingencyMinorUnits,
      vatMinorUnits: charges.value.vatMinorUnits,
      totalMinorUnits: charges.value.totalMinorUnits,
      total: charges.value.totalMinorUnits / MINOR_UNIT_FACTOR,
    },
  };
}
