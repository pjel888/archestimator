import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const DIRECT_WRITERS = [
  "src/lib/estimates/express-promotion-actions.ts",
  "src/lib/ai/package-builder/apply.ts",
] as const;

function expectCompleteEstimateEventInsert(source: string, path: string) {
  const insert = source.match(/INSERT INTO estimate_sheet_events\s*\(([\s\S]*?)\)\s*VALUES/);

  expect(insert, path).not.toBeNull();
  const columns = insert![1].split(",").map((column) => column.trim()).filter(Boolean);
  expect(columns).toHaveLength(19);
  expect(columns).toEqual(expect.arrayContaining(["target_row_id", "total_delta", "correlation_id", "payload"]));
}

describe("activity event insert shape", () => {
  it.each(DIRECT_WRITERS)("writes the complete 19-column event shape in %s", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    expectCompleteEstimateEventInsert(source, path);
  });

  it("keeps reusable-source history on the typed history owner with the complete event shape", () => {
    const reusablePath = "src/lib/reusable-sources/actions.ts";
    const historyPath = "src/lib/estimates/d1-intents/history-events.ts";
    const reusableSource = readFileSync(join(process.cwd(), reusablePath), "utf8");
    const historySource = readFileSync(join(process.cwd(), historyPath), "utf8");

    expect(reusableSource).toContain(
      'import { prepareHistoryEventInsert } from "@/lib/estimates/d1-intents/history-events";',
    );
    expect(reusableSource).toContain("const history = await prepareHistoryEventInsert(database, {");
    expectCompleteEstimateEventInsert(historySource, historyPath);
  });
});
