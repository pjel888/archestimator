import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/lib/estimates/d1-action-client.ts"), "utf8");

describe("first-area activation producer", () => {
  it("includes the prepared activation intent in the create-node D1 batch", () => {
    const createNodeSource = source.slice(source.indexOf("async function createEstimateNode"), source.indexOf("async function renameEstimateNode"));
    const batchHelperSource = source.slice(source.indexOf("async function runBatchWithPreparedStatements"), source.indexOf("async function readProjectContext"));

    expect(createNodeSource).toContain('milestone: "first_area_created"');
    expect(createNodeSource).toContain("prepareActivationOutboxIntent(database");
    expect(createNodeSource).toContain("}, activationStatements);");
    expect(createNodeSource).toContain("dedupeKey: intent.dedupeKey");
    expect(batchHelperSource).toContain("...preparedStatements");
    expect(batchHelperSource).toContain("database.batch([");
  });
});
