import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const nodeIntentSource = readFileSync(resolve(process.cwd(), "src/lib/estimates/d1-intents/nodes.ts"), "utf8");
const databaseIntentSource = readFileSync(resolve(process.cwd(), "src/lib/estimates/d1-intents/database.ts"), "utf8");

describe("first-area activation producer", () => {
  it("includes the prepared activation intent in the create-node D1 batch", () => {
    const createNodeSource = nodeIntentSource.slice(
      nodeIntentSource.indexOf("export async function createEstimateNodeWithHistory"),
      nodeIntentSource.indexOf("export async function renameEstimateNodeWithHistory"),
    );

    expect(createNodeSource).toContain('milestone: "first_area_created"');
    expect(createNodeSource).toContain("prepareActivationOutboxIntent(database");
    expect(createNodeSource).toContain("}, activationStatements);");
    expect(createNodeSource).toContain("dedupeKey: activationIntent.dedupeKey");
    expect(databaseIntentSource).toContain("...preparedStatements");
    expect(databaseIntentSource).toContain("database.batch([");
  });
});
