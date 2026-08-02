import { describe, expect, it } from "vitest";

import {
  buildInventoryReport,
  classifyRouteBucket,
  extractQueryReferencesFromSource,
  summarizeBuckets,
  summarizeSelectPayload,
} from "../../scripts/build-performance-query-inventory";

describe("performance query inventory", () => {
  it("classifies route buckets used by the performance plan", () => {
    expect(classifyRouteBucket("src/lib/repositories/workspace-repository.ts")).toBe("workshop-projects-estimates");
    expect(classifyRouteBucket("src/lib/repositories/component-library-repository.ts")).toBe("component-library");
    expect(classifyRouteBucket("src/lib/repositories/project-charts-repository.ts")).toBe("project-charts");
    expect(classifyRouteBucket("src/app/api/share/[token]/activity/route.ts")).toBe("public-share-publication");
  });

  it("extracts table/rpc references and payload shape from source", () => {
    const source = `
      await db.from("projects").select("id, name, estimates(id, name)").eq("id", projectId);
      await db.from("projects").select("id", { count: "exact", head: true });
      await db.from("estimate_row_items").insert([{ id: "row" }]);
      await db.rpc("submit_client_response", { id: "response" });
    `;
    const refs = extractQueryReferencesFromSource("src/lib/repositories/workspace-repository.ts", source);

    expect(refs).toEqual([
      expect.objectContaining({ name: "projects", operation: "select", payloadShape: "explicit-columns", selectedColumnCount: 3 }),
      expect.objectContaining({ name: "projects", operation: "select", payloadShape: "explicit-columns", selectedColumnCount: 1 }),
      expect.objectContaining({ name: "estimate_row_items", operation: "insert", payloadShape: "mutation-payload" }),
      expect.objectContaining({ name: "submit_client_response", operation: "rpc", payloadShape: "rpc" }),
    ]);
  });

  it("summarizes payload select shapes", () => {
    expect(summarizeSelectPayload("*", "select", "table")).toMatchObject({ payloadShape: "wildcard", selectedColumnCount: null });
    expect(summarizeSelectPayload("id, name, rows(id, material)", "select", "table")).toMatchObject({ payloadShape: "explicit-columns", selectedColumnCount: 3 });
    expect(summarizeSelectPayload(null, "update", "table")).toMatchObject({ payloadShape: "mutation-payload" });
  });

  it("builds bucket summaries for current D1-compatible publication action surfaces", () => {
    const report = buildInventoryReport(["src/lib/repositories", "src/lib/publication", "src/app/api/share"]);
    const buckets = new Set(report.bucketSummaries.map((bucket) => bucket.bucket));

    expect(report.references.length).toBeGreaterThan(0);
    expect(buckets.has("public-share-publication")).toBe(true);
    expect(report.bucketSummaries.find((bucket) => bucket.bucket === "public-share-publication")?.files).toContain(
      "src/lib/publication/actions.ts",
    );
    expect(summarizeBuckets(report.references).every((bucket) => bucket.referenceCount > 0)).toBe(true);
  });

  it("fails closed when every requested inventory root is missing", () => {
    expect(() => buildInventoryReport(["tests/fixtures/missing-performance-query-inventory-root"]))
      .toThrow("No database table/RPC references found for query inventory.");
  });
});
