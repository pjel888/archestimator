import Decimal from "decimal.js";

export type EstimateCostInput = {
  quantity: number;
  materialUnitCost?: number;
  laborUnitCost?: number;
  unitCost?: number;
  wastePercent?: number;
  markupPercent?: number;
  contingencyPercent?: number;
};

export type EstimateCostResult = {
  adjustedQuantity: number;
  materialSubtotal: number;
  laborSubtotal: number;
  subtotal: number;
  markupAmount: number;
  contingencyAmount: number;
  total: number;
};

const toMoneyNumber = (value: Decimal) => value.toDecimalPlaces(2).toNumber();
const toQuantityNumber = (value: Decimal) => value.toDecimalPlaces(4).toNumber();

export function calculateEstimateLineTotal(input: EstimateCostInput): EstimateCostResult {
  const quantity = new Decimal(input.quantity || 0);
  const wasteMultiplier = new Decimal(1).plus(new Decimal(input.wastePercent || 0).dividedBy(100));
  const adjustedQuantity = quantity.times(wasteMultiplier);

  const materialUnitCost = new Decimal(input.materialUnitCost ?? input.unitCost ?? 0);
  const laborUnitCost = new Decimal(input.laborUnitCost ?? 0);

  const materialSubtotal = adjustedQuantity.times(materialUnitCost);
  const laborSubtotal = adjustedQuantity.times(laborUnitCost);
  const subtotal = materialSubtotal.plus(laborSubtotal);
  const markupAmount = subtotal.times(new Decimal(input.markupPercent || 0).dividedBy(100));
  const contingencyAmount = subtotal.times(new Decimal(input.contingencyPercent || 0).dividedBy(100));
  const total = subtotal.plus(markupAmount).plus(contingencyAmount);

  return {
    adjustedQuantity: toQuantityNumber(adjustedQuantity),
    materialSubtotal: toMoneyNumber(materialSubtotal),
    laborSubtotal: toMoneyNumber(laborSubtotal),
    subtotal: toMoneyNumber(subtotal),
    markupAmount: toMoneyNumber(markupAmount),
    contingencyAmount: toMoneyNumber(contingencyAmount),
    total: toMoneyNumber(total),
  };
}
