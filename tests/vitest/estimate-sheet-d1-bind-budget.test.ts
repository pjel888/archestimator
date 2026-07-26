import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const estimateTreeReadRepositorySource = readFileSync(
  join(process.cwd(), "src/lib/estimates/estimate-tree-read-repository.ts"),
  "utf8",
);

function sourceForPrivateFunction(name: string) {
  const start = estimateTreeReadRepositorySource.indexOf(`async function ${name}`);
  const next = estimateTreeReadRepositorySource.indexOf("\nasync function ", start + 1);
  if (start < 0 || next < 0) throw new Error(`Could not locate ${name} in estimate tree read repository.`);
  return estimateTreeReadRepositorySource.slice(start, next);
}

describe("estimate sheet D1 row-load bind budget", () => {
  it("splits the 1,500-node row load into D1-safe node-id batches before restoring global order", () => {
    const source = sourceForPrivateFunction("readEstimateRows");
    const nodeIds = Array.from({ length: 1_500 }, (_, index) => `node-${index}`);

    expect(nodeIds).toHaveLength(1_500);
    expect(estimateTreeReadRepositorySource).toContain("const ESTIMATE_TREE_ROW_NODE_BATCH_SIZE = 64;");
    expect(source).toContain("options.nodeIds!.slice(index * ESTIMATE_TREE_ROW_NODE_BATCH_SIZE");
    expect(source).toContain("node_id IN (${placeholders(nodeIds)})");
    expect(source).toContain("values.push(...nodeIds)");
    expect(source).toContain("FROM estimate_row_items");
    expect(source).toContain(".sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))");
    expect(source).toContain("rows.slice(0, options.limit)");
  });
});
