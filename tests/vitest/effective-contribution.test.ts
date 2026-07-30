import { describe, expect, it } from "vitest";

import { resolveEffectiveContribution } from "@/lib/estimates/effective-contribution";

describe("effective contribution", () => {
  const rows = [
    { rowId: "root-a", directMinorUnits: 10_000, quantity: 2 },
    { rowId: "root-b", directMinorUnits: 8_000, quantity: 1 },
    { rowId: "child", directMinorUnits: 2_000, quantity: 1 },
  ];

  it("counts direct cost once and keeps presentation rollups non-additive", () => {
    const result = resolveEffectiveContribution({
      rows,
      additiveEdges: [{
        parentRowId: "root-a",
        childRowId: "child",
        effectiveDirectMinorUnits: 3_000,
        effectiveQuantity: 3,
      }],
    });

    expect(result).toMatchObject({ ok: true, totalMinorUnits: 21_000 });
    if (!result.ok) return;
    expect(result.rows.find((row) => row.rowId === "root-a")).toMatchObject({
      effectiveDirectMinorUnits: 10_000,
      presentationRollupMinorUnits: 13_000,
    });
    expect(result.rows.find((row) => row.rowId === "child")).toMatchObject({
      effectiveDirectMinorUnits: 3_000,
      effectiveQuantity: 3,
      rootRowId: "root-a",
    });
  });

  it("zeros unselected alternatives and every descendant", () => {
    const result = resolveEffectiveContribution({
      rows,
      alternativeGroups: [{
        groupId: "finish",
        memberRowIds: ["root-a", "root-b"],
        selectedRowId: "root-b",
      }],
      additiveEdges: [{
        parentRowId: "root-a",
        childRowId: "child",
        effectiveDirectMinorUnits: 3_000,
        effectiveQuantity: 3,
      }],
    });

    expect(result).toMatchObject({ ok: true, totalMinorUnits: 8_000 });
    if (!result.ok) return;
    expect(result.rows.find((row) => row.rowId === "root-a")?.inclusionReason)
      .toBe("alternative_not_selected");
    expect(result.rows.find((row) => row.rowId === "child")?.inclusionReason)
      .toBe("ancestor_excluded");
  });

  it("zeros excluded optional roots", () => {
    const result = resolveEffectiveContribution({
      rows: rows.slice(0, 2),
      optionalItems: [{ rowId: "root-a", included: false }],
    });

    expect(result).toMatchObject({ ok: true, totalMinorUnits: 8_000 });
  });

  it.each([
    {
      expected: "duplicate_parent",
      input: {
        rows,
        additiveEdges: [
          { parentRowId: "root-a", childRowId: "child", effectiveDirectMinorUnits: 1, effectiveQuantity: 1 },
          { parentRowId: "root-b", childRowId: "child", effectiveDirectMinorUnits: 1, effectiveQuantity: 1 },
        ],
      },
    },
    {
      expected: "cycle",
      input: {
        rows: rows.slice(0, 2),
        additiveEdges: [
          { parentRowId: "root-a", childRowId: "root-b", effectiveDirectMinorUnits: 1, effectiveQuantity: 1 },
          { parentRowId: "root-b", childRowId: "root-a", effectiveDirectMinorUnits: 1, effectiveQuantity: 1 },
        ],
      },
    },
    {
      expected: "duplicate_alternative_membership",
      input: {
        rows: rows.slice(0, 2),
        alternativeGroups: [
          { groupId: "one", memberRowIds: ["root-a", "root-b"], selectedRowId: "root-a" },
          { groupId: "two", memberRowIds: ["root-a", "root-b"], selectedRowId: "root-b" },
        ],
      },
    },
  ])("fails closed for $expected", ({ input, expected }) => {
    expect(resolveEffectiveContribution(input)).toMatchObject({ ok: false, code: expected });
  });
});
