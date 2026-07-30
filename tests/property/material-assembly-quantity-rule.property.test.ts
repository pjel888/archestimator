import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  evaluateAssemblyQuantityRule,
  parseAssemblyQuantityRule,
  serializeAssemblyQuantityRule,
} from "@/lib/estimates/assembly-quantity-rule";

function roundQuantity(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

describe("material assembly quantity rule properties", () => {
  it("preserves every admitted fixed six-decimal quantity", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000_000_000_000 }), (scaledQuantity) => {
        const quantity = scaledQuantity / 1_000_000;
        expect(evaluateAssemblyQuantityRule({ schemaVersion: 1, kind: "fixed", quantity }))
          .toEqual({ ok: true, quantity });
      }),
      { numRuns: 300 },
    );
  });

  it("keeps per-parent evaluation deterministic and equal to one final rounding", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (scaledFactor, scaledParent) => {
          const factor = scaledFactor / 1_000;
          const parentQuantity = scaledParent / 1_000;
          const rule = { schemaVersion: 1, kind: "per-parent", factor } as const;
          const context = { parentQuantity };
          const first = evaluateAssemblyQuantityRule(rule, context);
          const second = evaluateAssemblyQuantityRule(rule, context);

          expect(first).toEqual(second);
          expect(first).toEqual({ ok: true, quantity: roundQuantity(factor * parentQuantity) });
        },
      ),
      { numRuns: 300 },
    );
  });

  it("round-trips every admitted typed rule through canonical JSON", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("fixed", "per-parent", "area", "edge-length"),
        fc.integer({ min: 0, max: 1_000_000_000_000_000 }),
        (kind, scaledValue) => {
          const value = scaledValue / 1_000_000;
          const rule = kind === "fixed"
            ? { schemaVersion: 1, kind, quantity: value }
            : kind === "per-parent"
              ? { schemaVersion: 1, kind, factor: value }
              : kind === "area"
                ? { schemaVersion: 1, kind, factor: value, unit: "m2" }
                : { schemaVersion: 1, kind, factor: value, unit: "m" };
          const serialized = serializeAssemblyQuantityRule(rule);

          expect(serialized.ok).toBe(true);
          if (!serialized.ok) return;
          expect(parseAssemblyQuantityRule(JSON.parse(serialized.json))).toEqual({ ok: true, rule: serialized.rule });
          expect(serializeAssemblyQuantityRule(JSON.parse(serialized.json))).toEqual(serialized);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("evaluates generated formula inputs without depending on object identity or key order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        (scaledParent, scaledLength, divisor) => {
          const parentQuantity = scaledParent / 1_000;
          const edgeLength = scaledLength / 1_000;
          const rule = {
            kind: "formula",
            schemaVersion: 1,
            edgeLengthUnit: "m",
            areaUnit: "m2",
            expression: {
              type: "add",
              left: { type: "variable", name: "parentQuantity" },
              right: {
                type: "divide",
                left: { type: "variable", name: "edgeLength" },
                right: { type: "literal", value: divisor },
              },
            },
          } as const;
          const expected = roundQuantity(parentQuantity + edgeLength / divisor);

          expect(evaluateAssemblyQuantityRule(rule, {
            parentQuantity,
            edgeLength: { value: edgeLength, unit: "m" },
          })).toEqual({ ok: true, quantity: expected });
        },
      ),
      { numRuns: 300 },
    );
  });
});
