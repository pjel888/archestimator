import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const WRITERS = [
  "src/lib/reusable-sources/actions.ts",
  "src/lib/estimates/express-promotion-actions.ts",
  "src/lib/ai/package-builder/apply.ts",
] as const;

describe("activity event insert shape", () => {
  it.each(WRITERS)("writes the complete 19-column event shape in %s", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    const insert = source.match(/INSERT INTO estimate_sheet_events\s*\(([\s\S]*?)\)\s*VALUES/);

    expect(insert, path).not.toBeNull();
    const columns = insert![1].split(",").map((column) => column.trim()).filter(Boolean);
    expect(columns).toHaveLength(19);
    expect(columns).toEqual(expect.arrayContaining(["target_row_id", "total_delta", "correlation_id", "payload"]));
  });
});
