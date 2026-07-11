import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repositorySource = readFileSync(
  join(process.cwd(), "src/lib/repositories/workspace-repository.ts"),
  "utf8",
);

function sourceForPrivateFunction(name: string) {
  const start = repositorySource.indexOf(`async function ${name}`);
  const next = repositorySource.indexOf("\nasync function ", start + 1);
  if (start < 0 || next < 0) throw new Error(`Could not locate ${name} in workspace repository.`);
  return repositorySource.slice(start, next);
}

describe("estimate sheet D1 row-load bind budget", () => {
  it("characterizes the current 1,500-node row load as one bind per node in one statement", () => {
    const source = sourceForPrivateFunction("readEstimateRows");
    const nodeIds = Array.from({ length: 1_500 }, (_, index) => `node-${index}`);

    expect(nodeIds).toHaveLength(1_500);
    expect(source).toContain("node_id IN (${placeholders(options.nodeIds)})");
    expect(source).toContain("values.push(...options.nodeIds)");
    expect(source).toContain("FROM estimate_row_items");
    expect(source).not.toMatch(/chunk|slice\(|for\s*\(/i);
  });
});
