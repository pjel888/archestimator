import { describe, expect, it } from "vitest";

import {
  makeBenchmarkModel,
  makeProposalRow,
  parseRowCounts,
  runBenchmark,
  toMiB,
} from "../../scripts/benchmark-proposal-workbook";

describe("proposal workbook benchmark fixture", () => {
  it("parses positive comma-separated row counts and rejects empty input", () => {
    expect(parseRowCounts(" 2, 5, ignored, 0, -1, 10 ")).toEqual([2, 5, 10]);
    expect(() => parseRowCounts("0, nope, -3")).toThrow("at least one positive row count");
  });

  it("creates deterministic BOQ rows with source breakdown metadata", () => {
    const row = makeProposalRow(0);

    expect(row.exportRowId).toBe("benchmark-proposal-row-00001");
    expect(row.sectionLabel).toBe("General Preliminaries");
    expect(row.sectionKey).toBe("general-preliminaries");
    expect(row.rowNumber).toBe("1");
    expect(row.quantity).toBe(1);
    expect(row.materialSubtotal).toBe(450);
    expect(row.costAmount).toBe(700);
    expect(row.sourceRowIds).toEqual(["benchmark-source-row-00001"]);
    expect(row.sources[0]).toMatchObject({
      sourceNodeId: "benchmark-area-01",
      areaPathLabel: "Benchmark Project / Level 1 / Benchmark Area 1",
      costAmount: 700,
    });
  });

  it("builds a self-consistent model with summary and source rows", () => {
    const model = makeBenchmarkModel(25);

    expect(model.metadata.estimateSheetCode).toBe("BENCH-25");
    expect(model.settings.includeSourceBreakdownSheet).toBe(true);
    expect(model.proposalRows).toHaveLength(25);
    expect(model.sourceBreakdownRows).toHaveLength(25);
    expect(model.summaryRows).toHaveLength(10);
    expect(model.totals.grandTotal).toBe(model.proposalRows.reduce((sum, row) => sum + row.costAmount, 0));
    expect(model.summaryRows.reduce((sum, row) => sum + row.rowCount, 0)).toBe(25);
    expect(model.validationIssues[0]?.code).toBe("benchmark_fixture");
  });

  it("runs the real workbook builder for a tiny benchmark fixture", async () => {
    const run = await runBenchmark(3);

    expect(run.rowCount).toBe(3);
    expect(run.sourceBreakdownRowCount).toBe(3);
    expect(run.summaryRowCount).toBe(3);
    expect(run.durationMs).toBeGreaterThanOrEqual(0);
    expect(run.bufferBytes).toBeGreaterThan(0);
    expect(run.bufferMiB).toBe(toMiB(run.bufferBytes));
  });
});
