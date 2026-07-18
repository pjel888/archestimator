import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/lib/estimates/d1-intents/rows.ts"), "utf8");
const insertRowItemSource = source.slice(
  source.indexOf("export async function insertEstimateRowItemWithHistory"),
  source.indexOf("export async function duplicateEstimateRowItemWithHistory"),
);

describe("estimate row activation producers", () => {
  it("writes priced-row and positive-total intents in the same insert batch after idempotency handling", () => {
    expect(insertRowItemSource.indexOf('if (existingEvent)')).toBeLessThan(insertRowItemSource.indexOf('milestone: "first_row_priced"'));
    expect(insertRowItemSource).toContain('milestone: "first_row_priced"');
    expect(insertRowItemSource).toContain("if (insertedRowTotalMinorUnits > 0)");
    expect(insertRowItemSource).toContain('milestone: "first_valid_total"');
    expect(insertRowItemSource).toContain('dedupeKey: rowIntent.dedupeKey');
    expect(insertRowItemSource).toContain('dedupeKey: totalIntent.dedupeKey');
    expect(insertRowItemSource).toContain("runPreparedD1Batch(database, statements, activationStatements)");
  });
});
