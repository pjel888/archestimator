const ASSEMBLY_QUANTITY_RULE_VERSION = 1 as const;
export const MAX_ASSEMBLY_QUANTITY_AST_DEPTH = 8;
export const MAX_ASSEMBLY_QUANTITY_AST_NODES = 32;
const MAX_ASSEMBLY_QUANTITY_OPERAND = 1_000_000_000;
const MAX_ASSEMBLY_QUANTITY_RESULT = 9_000_000_000;
const ASSEMBLY_QUANTITY_DECIMAL_PLACES = 6;

type AssemblyAreaUnit = "m2" | "ft2";
type AssemblyLengthUnit = "m" | "ft";
type AssemblyQuantityVariable = "parentQuantity" | "area" | "edgeLength";

export type AssemblyQuantityExpression =
  | { type: "literal"; value: number }
  | { type: "variable"; name: AssemblyQuantityVariable }
  | {
    type: "add" | "subtract" | "multiply" | "divide";
    left: AssemblyQuantityExpression;
    right: AssemblyQuantityExpression;
  };

export type AssemblyQuantityRule =
  | { schemaVersion: 1; kind: "fixed"; quantity: number }
  | { schemaVersion: 1; kind: "per-parent"; factor: number }
  | { schemaVersion: 1; kind: "area"; factor: number; unit: AssemblyAreaUnit }
  | { schemaVersion: 1; kind: "edge-length"; factor: number; unit: AssemblyLengthUnit }
  | {
    schemaVersion: 1;
    kind: "formula";
    areaUnit: "m2";
    edgeLengthUnit: "m";
    expression: AssemblyQuantityExpression;
  };

export type AssemblyQuantityRuleContext = {
  parentQuantity?: number;
  area?: { value: number; unit: AssemblyAreaUnit };
  edgeLength?: { value: number; unit: AssemblyLengthUnit };
};

type AssemblyQuantityRuleErrorCode =
  | "invalid_rule"
  | "unsupported_version"
  | "unsupported_kind"
  | "unsafe_number"
  | "depth_limit"
  | "node_limit"
  | "missing_variable"
  | "division_by_zero"
  | "negative_result"
  | "result_overflow";

export type AssemblyQuantityRuleError = {
  code: AssemblyQuantityRuleErrorCode;
  path: string;
  message: string;
};

export type ParseAssemblyQuantityRuleResult =
  | { ok: true; rule: AssemblyQuantityRule }
  | { ok: false; error: AssemblyQuantityRuleError };

export type EvaluateAssemblyQuantityRuleResult =
  | { ok: true; quantity: number }
  | { ok: false; error: AssemblyQuantityRuleError };

const ERROR_MESSAGES: Record<AssemblyQuantityRuleErrorCode, string> = {
  invalid_rule: "Quantity rule is malformed.",
  unsupported_version: "Quantity rule schema version is unsupported.",
  unsupported_kind: "Quantity rule kind is unsupported.",
  unsafe_number: "Quantity rule contains a non-finite or unsafe number.",
  depth_limit: "Quantity formula exceeds the maximum depth.",
  node_limit: "Quantity formula exceeds the maximum node count.",
  missing_variable: "Quantity formula requires a missing measurement.",
  division_by_zero: "Quantity formula cannot divide by zero.",
  negative_result: "Quantity rule cannot produce a negative quantity.",
  result_overflow: "Quantity rule result exceeds the supported bound.",
};

function failure(
  code: AssemblyQuantityRuleErrorCode,
  path: string,
): { ok: false; error: AssemblyQuantityRuleError } {
  return { ok: false, error: { code, path, message: ERROR_MESSAGES[code] } };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key))
    && keys.every((key) => key in value);
}

function isBoundedNumber(value: unknown, maximum: number, allowNegative = false): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Math.abs(value) <= maximum
    && (allowNegative || value >= 0);
}

function isSafeDecimalOperand(value: unknown, allowNegative = false): value is number {
  if (!isBoundedNumber(value, MAX_ASSEMBLY_QUANTITY_OPERAND, allowNegative)) return false;
  const scale = 10 ** ASSEMBLY_QUANTITY_DECIMAL_PLACES;
  const scaled = Math.round(value * scale);
  return Number.isSafeInteger(scaled)
    && Math.abs(value - scaled / scale) <= Number.EPSILON * Math.max(1, Math.abs(value));
}

function parseExpression(
  value: unknown,
  path: string,
  depth: number,
  state: { nodes: number },
): { ok: true; expression: AssemblyQuantityExpression } | { ok: false; error: AssemblyQuantityRuleError } {
  if (depth > MAX_ASSEMBLY_QUANTITY_AST_DEPTH) return failure("depth_limit", path);
  state.nodes += 1;
  if (state.nodes > MAX_ASSEMBLY_QUANTITY_AST_NODES) return failure("node_limit", path);

  const input = record(value);
  if (!input || typeof input.type !== "string") return failure("invalid_rule", path);
  if (input.type === "literal") {
    if (!hasOnlyKeys(input, ["type", "value"])) return failure("invalid_rule", path);
    if (!isSafeDecimalOperand(input.value, true)) return failure("unsafe_number", `${path}.value`);
    return { ok: true, expression: { type: "literal", value: input.value } };
  }
  if (input.type === "variable") {
    if (!hasOnlyKeys(input, ["type", "name"])) return failure("invalid_rule", path);
    if (input.name !== "parentQuantity" && input.name !== "area" && input.name !== "edgeLength") {
      return failure("invalid_rule", `${path}.name`);
    }
    return { ok: true, expression: { type: "variable", name: input.name } };
  }
  if (input.type !== "add" && input.type !== "subtract" && input.type !== "multiply" && input.type !== "divide") {
    return failure("invalid_rule", `${path}.type`);
  }
  if (!hasOnlyKeys(input, ["type", "left", "right"])) return failure("invalid_rule", path);
  const left = parseExpression(input.left, `${path}.left`, depth + 1, state);
  if (!left.ok) return left;
  const right = parseExpression(input.right, `${path}.right`, depth + 1, state);
  if (!right.ok) return right;
  return {
    ok: true,
    expression: { type: input.type, left: left.expression, right: right.expression },
  };
}

export function parseAssemblyQuantityRule(value: unknown): ParseAssemblyQuantityRuleResult {
  const input = record(value);
  if (!input) return failure("invalid_rule", "$rule");
  if (input.schemaVersion !== ASSEMBLY_QUANTITY_RULE_VERSION) {
    return failure("unsupported_version", "$rule.schemaVersion");
  }
  if (typeof input.kind !== "string") return failure("unsupported_kind", "$rule.kind");

  if (input.kind === "fixed") {
    if (!hasOnlyKeys(input, ["schemaVersion", "kind", "quantity"])) return failure("invalid_rule", "$rule");
    if (!isSafeDecimalOperand(input.quantity)) return failure("unsafe_number", "$rule.quantity");
    return { ok: true, rule: { schemaVersion: 1, kind: "fixed", quantity: input.quantity } };
  }
  if (input.kind === "per-parent") {
    if (!hasOnlyKeys(input, ["schemaVersion", "kind", "factor"])) return failure("invalid_rule", "$rule");
    if (!isSafeDecimalOperand(input.factor)) return failure("unsafe_number", "$rule.factor");
    return { ok: true, rule: { schemaVersion: 1, kind: "per-parent", factor: input.factor } };
  }
  if (input.kind === "area") {
    if (!hasOnlyKeys(input, ["schemaVersion", "kind", "factor", "unit"])) return failure("invalid_rule", "$rule");
    if (!isSafeDecimalOperand(input.factor)) return failure("unsafe_number", "$rule.factor");
    if (input.unit !== "m2" && input.unit !== "ft2") return failure("invalid_rule", "$rule.unit");
    return { ok: true, rule: { schemaVersion: 1, kind: "area", factor: input.factor, unit: input.unit } };
  }
  if (input.kind === "edge-length") {
    if (!hasOnlyKeys(input, ["schemaVersion", "kind", "factor", "unit"])) return failure("invalid_rule", "$rule");
    if (!isSafeDecimalOperand(input.factor)) return failure("unsafe_number", "$rule.factor");
    if (input.unit !== "m" && input.unit !== "ft") return failure("invalid_rule", "$rule.unit");
    return { ok: true, rule: { schemaVersion: 1, kind: "edge-length", factor: input.factor, unit: input.unit } };
  }
  if (input.kind === "formula") {
    if (!hasOnlyKeys(input, ["schemaVersion", "kind", "areaUnit", "edgeLengthUnit", "expression"])) {
      return failure("invalid_rule", "$rule");
    }
    if (input.areaUnit !== "m2" || input.edgeLengthUnit !== "m") {
      return failure("invalid_rule", "$rule");
    }
    const expression = parseExpression(input.expression, "$rule.expression", 1, { nodes: 0 });
    if (!expression.ok) return expression;
    return {
      ok: true,
      rule: {
        schemaVersion: 1,
        kind: "formula",
        areaUnit: "m2",
        edgeLengthUnit: "m",
        expression: expression.expression,
      },
    };
  }
  return failure("unsupported_kind", "$rule.kind");
}

function convertArea(value: number, from: AssemblyAreaUnit, to: AssemblyAreaUnit) {
  if (from === to) return value;
  return from === "ft2" ? value * 0.09290304 : value / 0.09290304;
}

function convertLength(value: number, from: AssemblyLengthUnit, to: AssemblyLengthUnit) {
  if (from === to) return value;
  return from === "ft" ? value * 0.3048 : value / 0.3048;
}

function contextNumber(
  value: unknown,
  path: string,
): { ok: true; value: number } | { ok: false; error: AssemblyQuantityRuleError } {
  return isSafeDecimalOperand(value)
    ? { ok: true, value }
    : failure("unsafe_number", path);
}

function formulaVariable(
  name: AssemblyQuantityVariable,
  context: AssemblyQuantityRuleContext,
  path: string,
): { ok: true; value: number } | { ok: false; error: AssemblyQuantityRuleError } {
  if (name === "parentQuantity") {
    if (context.parentQuantity === undefined) return failure("missing_variable", path);
    return contextNumber(context.parentQuantity, "$context.parentQuantity");
  }
  if (name === "area") {
    if (!context.area) return failure("missing_variable", path);
    const measured = contextNumber(context.area.value, "$context.area.value");
    return measured.ok
      ? { ok: true, value: convertArea(measured.value, context.area.unit, "m2") }
      : measured;
  }
  if (!context.edgeLength) return failure("missing_variable", path);
  const measured = contextNumber(context.edgeLength.value, "$context.edgeLength.value");
  return measured.ok
    ? { ok: true, value: convertLength(measured.value, context.edgeLength.unit, "m") }
    : measured;
}

function evaluateExpression(
  expression: AssemblyQuantityExpression,
  context: AssemblyQuantityRuleContext,
  path: string,
): { ok: true; value: number } | { ok: false; error: AssemblyQuantityRuleError } {
  if (expression.type === "literal") return { ok: true, value: expression.value };
  if (expression.type === "variable") return formulaVariable(expression.name, context, path);
  const left = evaluateExpression(expression.left, context, `${path}.left`);
  if (!left.ok) return left;
  const right = evaluateExpression(expression.right, context, `${path}.right`);
  if (!right.ok) return right;
  if (expression.type === "divide" && right.value === 0) return failure("division_by_zero", `${path}.right`);

  const value = expression.type === "add"
    ? left.value + right.value
    : expression.type === "subtract"
      ? left.value - right.value
      : expression.type === "multiply"
        ? left.value * right.value
        : left.value / right.value;
  if (!Number.isFinite(value)) return failure("unsafe_number", path);
  if (Math.abs(value) > MAX_ASSEMBLY_QUANTITY_RESULT) return failure("result_overflow", path);
  return { ok: true, value };
}

function roundedQuantity(value: number) {
  const scale = 10 ** ASSEMBLY_QUANTITY_DECIMAL_PLACES;
  const rounded = Math.round(value * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function evaluateAssemblyQuantityRule(
  value: unknown,
  context: AssemblyQuantityRuleContext = {},
): EvaluateAssemblyQuantityRuleResult {
  const parsed = parseAssemblyQuantityRule(value);
  if (!parsed.ok) return parsed;
  const rule = parsed.rule;
  let evaluated: { ok: true; value: number } | { ok: false; error: AssemblyQuantityRuleError };

  if (rule.kind === "fixed") {
    evaluated = { ok: true, value: rule.quantity };
  } else if (rule.kind === "per-parent") {
    if (context.parentQuantity === undefined) return failure("missing_variable", "$context.parentQuantity");
    const parentQuantity = contextNumber(context.parentQuantity, "$context.parentQuantity");
    evaluated = parentQuantity.ok
      ? { ok: true, value: parentQuantity.value * rule.factor }
      : parentQuantity;
  } else if (rule.kind === "area") {
    if (!context.area) return failure("missing_variable", "$context.area");
    const area = contextNumber(context.area.value, "$context.area.value");
    evaluated = area.ok
      ? { ok: true, value: convertArea(area.value, context.area.unit, rule.unit) * rule.factor }
      : area;
  } else if (rule.kind === "edge-length") {
    if (!context.edgeLength) return failure("missing_variable", "$context.edgeLength");
    const edgeLength = contextNumber(context.edgeLength.value, "$context.edgeLength.value");
    evaluated = edgeLength.ok
      ? { ok: true, value: convertLength(edgeLength.value, context.edgeLength.unit, rule.unit) * rule.factor }
      : edgeLength;
  } else {
    evaluated = evaluateExpression(rule.expression, context, "$rule.expression");
  }

  if (!evaluated.ok) return evaluated;
  if (!Number.isFinite(evaluated.value)) return failure("unsafe_number", "$result");
  if (evaluated.value < 0) return failure("negative_result", "$result");
  if (evaluated.value > MAX_ASSEMBLY_QUANTITY_RESULT) return failure("result_overflow", "$result");
  return { ok: true, quantity: roundedQuantity(evaluated.value) };
}

export function serializeAssemblyQuantityRule(
  value: unknown,
): { ok: true; json: string; rule: AssemblyQuantityRule } | { ok: false; error: AssemblyQuantityRuleError } {
  const parsed = parseAssemblyQuantityRule(value);
  return parsed.ok
    ? { ok: true, json: JSON.stringify(parsed.rule), rule: parsed.rule }
    : parsed;
}
