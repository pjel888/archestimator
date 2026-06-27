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
  if (contingencyAmount <= 0) return base;
  return `${base} + ${formatQuantityPart(contingencyAmount)}`;
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

  if (/[^0-9.+]/.test(compact)) return invalidQuantityExpression("Use numbers and one + only.");

  const parts = compact.split("+");
  if (parts.length > 2) return invalidQuantityExpression("Use only one +.");
  if (parts.length === 2 && (parts[0] === "" || parts[1] === "")) {
    return invalidQuantityExpression("Enter both base and contingency.");
  }

  const baseQuantity = parseDecimalOperand(parts[0]);
  if (baseQuantity === null) return invalidQuantityExpression("Enter a valid base quantity.");

  const contingencyAmount = parts.length === 2 ? parseDecimalOperand(parts[1]) : 0;
  if (contingencyAmount === null) return invalidQuantityExpression("Enter a valid contingency quantity.");

  const totalQuantity = baseQuantity + contingencyAmount;
  const hasContingencyExpression = parts.length === 2;
  const hasContingency = hasContingencyExpression && contingencyAmount > 0;
  const contingencyPercentage = baseQuantity > 0 ? (contingencyAmount / baseQuantity) * 100 : 0;

  return {
    baseQuantity,
    contingencyAmount,
    totalQuantity,
    contingencyPercentage,
    expression: hasContingency ? formatQuantityExpression(baseQuantity, contingencyAmount) : formatQuantityPart(totalQuantity),
    hasContingency,
    hasContingencyExpression,
    isValid: true,
  };
}
