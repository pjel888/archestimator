import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/lib/estimates/d1-intents/rows.ts"), "utf8");
const insertRowItemSource = source.slice(
  source.indexOf("export async function insertEstimateRowItemWithHistory"),
  source.indexOf("export async function duplicateEstimateRowItemWithHistory"),
);
const pricedRowActivationSource = source.slice(
  source.indexOf("function preparePricedRowActivationStatements"),
  source.indexOf("function minorUnitsToAmount"),
);

describe("estimate row activation producers", () => {
  it("writes priced-row and positive-total intents in the same insert batch after idempotency handling", () => {
    expect(insertRowItemSource.indexOf("if (existingEvent)")).toBeLessThan(
      insertRowItemSource.indexOf("preparePricedRowActivationStatements"),
    );
    expect(pricedRowActivationSource).toContain(
      '(["first_row_priced", "first_valid_total"] as const)',
    );
    expect(pricedRowActivationSource).toContain(
      "if (estimateRowTotalMinorUnits(input.row) <= 0) return [];",
    );
    expect(pricedRowActivationSource).toContain(
      "dedupeKey: activationIntent.dedupeKey",
    );
    expect(insertRowItemSource).toContain("runPreparedD1Batch(database, statements, activationStatements)");
  });
});
