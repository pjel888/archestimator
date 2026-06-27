export type QuantityExpressionResult = {
  baseQuantity: number;
  contingencyAmount: number;
  totalQuantity: number;
  contingencyPercentage: number;
  expression: string;
  hasContingency: boolean;
  hasContingencyExpression: boolean;
  isValid: boolean;
  error?: string;
};

function invalidQuantityExpression(error: string): QuantityExpressionResult {
  return {
    baseQuantity: 0,
    contingencyAmount: 0,
    totalQuantity: 0,
    contingencyPercentage: 0,
    expression: "",
    hasContingency: false,
    hasContingencyExpression: false,
    isValid: false,
    error,
  };
}

function parseDecimalOperand(value: string): number | null {
  if (!/^(?:\d+|\d+\.\d+|\.\d+)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatQuantityPart(value: number) {
  if (!Number.isFinite(value)) return "0";
  return String(Number(value.toFixed(6)));
}

export function formatQuantityExpression(baseQuantity: number, contingencyAmount: number) {
  const base = formatQuantityPart(baseQuantity);
  if (contingencyAmount === 0) return base;
  const operator = contingencyAmount < 0 ? "-" : "+";
  return `${base} ${operator} ${formatQuantityPart(Math.abs(contingencyAmount))}`;
}

export function parseQuantityExpression(input: string): QuantityExpressionResult {
  const compact = input.replace(/\s+/g, "");

  if (compact === "") {
    return {
      baseQuantity: 0,
      contingencyAmount: 0,
      totalQuantity: 0,
      contingencyPercentage: 0,
      expression: "",
      hasContingency: false,
      hasContingencyExpression: false,
      isValid: true,
    };
  }

  if (/[^0-9.+-]/.test(compact)) return invalidQuantityExpression("Use numbers and one + or - only.");

  const match = /^((?:\d+|\d+\.\d+|\.\d+))(?:([+-])((?:\d+|\d+\.\d+|\.\d+)))?$/.exec(compact);
  if (!match) return invalidQuantityExpression("Enter a base quantity and an optional + or - adjustment.");

  const baseQuantity = parseDecimalOperand(match[1]);
  if (baseQuantity === null) return invalidQuantityExpression("Enter a valid base quantity.");

  const operator = match[2] ?? "";
  const unsignedAdjustment = match[3] === undefined ? 0 : parseDecimalOperand(match[3]);
  const contingencyAmount = unsignedAdjustment === null ? null : operator === "-" ? -unsignedAdjustment : unsignedAdjustment;
  if (contingencyAmount === null) return invalidQuantityExpression("Enter a valid contingency quantity.");

  const totalQuantity = baseQuantity + contingencyAmount;
  if (totalQuantity < 0) return invalidQuantityExpression("Quantity adjustment cannot make the total quantity negative.");

  const hasContingencyExpression = Boolean(operator);
  const hasContingency = Boolean(operator) && contingencyAmount !== 0;
  const contingencyPercentage = baseQuantity > 0 ? (contingencyAmount / baseQuantity) * 100 : 0;

  return {
    baseQuantity,
    contingencyAmount,
    totalQuantity,
    contingencyPercentage,
    expression: hasContingency ? formatQuantityExpression(baseQuantity, contingencyAmount) : formatQuantityPart(totalQuantity),
    hasContingency,
    hasContingencyExpression: Boolean(operator),
    isValid: true,
  };
}
