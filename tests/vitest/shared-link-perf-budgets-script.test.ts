import { describe, expect, it } from "vitest";

import {
  parsePositiveIntegerList,
  renderMeasurementRowsForMarkdown,
  runPerfBudgetMeasurement,
} from "../../scripts/measure-shared-link-perf-budgets";

describe("shared-link perf budget measurement helper", () => {
  it("parses positive row/count lists for repeatable evidence commands", () => {
    expect(parsePositiveIntegerList("100, 1000, nope, 10000", "--rows")).toEqual([100, 1000, 10000]);
    expect(() => parsePositiveIntegerList("nope", "--rows")).toThrow(/--rows/);
  });

  it("captures snapshot byte budgets and keeps large compact snapshots inside budget", async () => {
    const rows = await runPerfBudgetMeasurement({
      mode: "snapshot-bytes",
      rows: [100, 10000],
      samples: 1,
      out: "/tmp/unused-perf-budgets.md",
      append: false,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        env: "local",
        fixture: "local-synthetic-tabbed-snapshot",
        mode: "snapshot-bytes",
        rowsN: 100,
        samples: 1,
        unit: "bytes",
        status: "PASS",
      }),
    );
    expect(rows[1]?.p95).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(rows[1]?.status).toBe("PASS");
  });

  it("captures local rotate-cost harness numbers without claiming provider DB timing", async () => {
    const [row] = await runPerfBudgetMeasurement({
      mode: "rotate-cost",
      rows: [10],
      samples: 1,
      out: "/tmp/unused-perf-budgets.md",
      append: false,
    });

    expect(row).toEqual(
      expect.objectContaining({
        env: "local",
        fixture: "local-token-hash-loop-no-db-lock",
        mode: "rotate-cost",
        rowsN: 10,
        unit: "ms",
      }),
    );
    expect(row?.note).toContain("provider lock/update cost still requires Supabase evidence");
  });

  it("renders measurement rows without dropping mode-specific evidence rows", async () => {
    const rows = await runPerfBudgetMeasurement({
      mode: "password-unlock",
      rows: [500],
      samples: 1,
      out: "/tmp/unused-perf-budgets.md",
      append: false,
    });

    const tableRows = renderMeasurementRowsForMarkdown(rows);
    expect(tableRows).toContain("| password-unlock | 500 | 1 |");
    expect(tableRows).toContain("CPU-only scrypt verify");
  });
});
