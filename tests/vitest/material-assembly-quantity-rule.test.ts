import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  MAX_ASSEMBLY_QUANTITY_AST_DEPTH,
  MAX_ASSEMBLY_QUANTITY_AST_NODES,
  evaluateAssemblyQuantityRule,
  parseAssemblyQuantityRule,
  serializeAssemblyQuantityRule,
  type AssemblyQuantityExpression,
} from "@/lib/estimates/assembly-quantity-rule";

const literal = (value: number): AssemblyQuantityExpression => ({ type: "literal", value });

function nestedExpression(depth: number): AssemblyQuantityExpression {
  return depth === 0
    ? literal(1)
    : { type: "add", left: literal(1), right: nestedExpression(depth - 1) };
}

function balancedExpression(leaves: number): AssemblyQuantityExpression {
  if (leaves === 1) return literal(1);
  const leftLeaves = Math.floor(leaves / 2);
  return {
    type: "add",
    left: balancedExpression(leftLeaves),
    right: balancedExpression(leaves - leftLeaves),
  };
}

describe("material assembly quantity rules", () => {
  it("evaluates every typed rule from original measurements", () => {
    expect(evaluateAssemblyQuantityRule({ schemaVersion: 1, kind: "fixed", quantity: 2.345678 }))
      .toEqual({ ok: true, quantity: 2.345678 });
    expect(evaluateAssemblyQuantityRule(
      { schemaVersion: 1, kind: "per-parent", factor: 1.5 },
      { parentQuantity: 4 },
    )).toEqual({ ok: true, quantity: 6 });
    expect(evaluateAssemblyQuantityRule(
      { schemaVersion: 1, kind: "area", factor: 2, unit: "m2" },
      { area: { value: 100, unit: "ft2" } },
    )).toEqual({ ok: true, quantity: 18.580608 });
    expect(evaluateAssemblyQuantityRule(
      { schemaVersion: 1, kind: "edge-length", factor: 2, unit: "m" },
      { edgeLength: { value: 10, unit: "ft" } },
    )).toEqual({ ok: true, quantity: 6.096 });
  });

  it("evaluates the bounded formula AST deterministically and rounds only the final result", () => {
    const rule = {
      schemaVersion: 1,
      kind: "formula",
      areaUnit: "m2",
      edgeLengthUnit: "m",
      expression: {
        type: "add",
        left: {
          type: "multiply",
          left: { type: "variable", name: "parentQuantity" },
          right: { type: "literal", value: 0.333333 },
        },
        right: {
          type: "divide",
          left: { type: "variable", name: "edgeLength" },
          right: { type: "literal", value: 3 },
        },
      },
    } as const;
    const context = { parentQuantity: 3, edgeLength: { value: 10, unit: "ft" as const } };

    expect(evaluateAssemblyQuantityRule(rule, context)).toEqual({ ok: true, quantity: 2.015999 });
    expect(evaluateAssemblyQuantityRule(rule, context)).toEqual(evaluateAssemblyQuantityRule(rule, context));
  });

  it("canonicalizes parsed rules for stable persistence", () => {
    const input = { kind: "fixed", quantity: 4.25, schemaVersion: 1 };
    const serialized = serializeAssemblyQuantityRule(input);

    expect(serialized).toEqual({
      ok: true,
      json: '{"schemaVersion":1,"kind":"fixed","quantity":4.25}',
      rule: { schemaVersion: 1, kind: "fixed", quantity: 4.25 },
    });
    if (serialized.ok) expect(parseAssemblyQuantityRule(JSON.parse(serialized.json))).toEqual({ ok: true, rule: serialized.rule });
  });

  it("fails closed for missing measurements, division by zero, negative results, and overflow", () => {
    expect(evaluateAssemblyQuantityRule({ schemaVersion: 1, kind: "per-parent", factor: 2 }))
      .toMatchObject({ ok: false, error: { code: "missing_variable" } });
    expect(evaluateAssemblyQuantityRule({
      schemaVersion: 1,
      kind: "formula",
      areaUnit: "m2",
      edgeLengthUnit: "m",
      expression: { type: "divide", left: literal(1), right: literal(0) },
    })).toMatchObject({ ok: false, error: { code: "division_by_zero" } });
    expect(evaluateAssemblyQuantityRule({
      schemaVersion: 1,
      kind: "formula",
      areaUnit: "m2",
      edgeLengthUnit: "m",
      expression: { type: "subtract", left: literal(1), right: literal(2) },
    })).toMatchObject({ ok: false, error: { code: "negative_result" } });
    expect(evaluateAssemblyQuantityRule({
      schemaVersion: 1,
      kind: "formula",
      areaUnit: "m2",
      edgeLengthUnit: "m",
      expression: { type: "multiply", left: literal(1_000_000_000), right: literal(1_000_000_000) },
    })).toMatchObject({ ok: false, error: { code: "result_overflow" } });
  });

  it("rejects malformed, unsafe, over-depth, and over-node rules", () => {
    expect(parseAssemblyQuantityRule({ schemaVersion: 2, kind: "fixed", quantity: 1 }))
      .toMatchObject({ ok: false, error: { code: "unsupported_version" } });
    expect(parseAssemblyQuantityRule({ schemaVersion: 1, kind: "script", source: "1 + 1" }))
      .toMatchObject({ ok: false, error: { code: "unsupported_kind" } });
    expect(parseAssemblyQuantityRule({ schemaVersion: 1, kind: "fixed", quantity: Number.NaN }))
      .toMatchObject({ ok: false, error: { code: "unsafe_number" } });
    expect(parseAssemblyQuantityRule({ schemaVersion: 1, kind: "fixed", quantity: 1.0000001 }))
      .toMatchObject({ ok: false, error: { code: "unsafe_number" } });
    expect(parseAssemblyQuantityRule({ schemaVersion: 1, kind: "fixed", quantity: 1, extra: true }))
      .toMatchObject({ ok: false, error: { code: "invalid_rule" } });
    expect(parseAssemblyQuantityRule({
      schemaVersion: 1,
      kind: "formula",
      areaUnit: "m2",
      edgeLengthUnit: "m",
      expression: nestedExpression(MAX_ASSEMBLY_QUANTITY_AST_DEPTH),
    })).toMatchObject({ ok: false, error: { code: "depth_limit" } });
    expect(parseAssemblyQuantityRule({
      schemaVersion: 1,
      kind: "formula",
      areaUnit: "m2",
      edgeLengthUnit: "m",
      expression: balancedExpression(MAX_ASSEMBLY_QUANTITY_AST_NODES),
    })).toMatchObject({ ok: false, error: { code: "node_limit" } });
  });

  it("contains no executable formula escape hatch", () => {
    const source = readFileSync("src/lib/estimates/assembly-quantity-rule.ts", "utf8");
    expect(source).not.toMatch(/\beval\s*\(|new\s+Function|Function\s*\(/);
  });
});
