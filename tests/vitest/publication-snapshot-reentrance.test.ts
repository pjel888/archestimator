import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("publication snapshot sanitization reentrance", () => {
  it("keeps ID maps invocation-local instead of storing mutable module state", () => {
    const source = readFileSync("src/lib/publication/snapshot.ts", "utf8");

    expect(source).not.toContain("currentSanitizeIdMaps");
    expect(source).toContain("sanitizeSnapshotRow(row as LegacyPublicationSnapshotRow, idMaps)");
    expect(source).toContain("sanitizeSnapshotTreeNodes(estimate.treeNodes, idMaps)");
  });
});
