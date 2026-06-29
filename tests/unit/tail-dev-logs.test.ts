import { describe, expect, test } from "bun:test";

import {
  buildLatestErrorSummary,
  buildExplainSummary,
  findLatestErrorRecord,
  filterRecords,
  parseNdjsonLines,
} from "../../scripts/tail-dev-logs.mjs";

describe("tail-dev-logs helpers", () => {
  test("parses valid NDJSON records", () => {
    const result = parseNdjsonLines([
      JSON.stringify({ record_id: "1", level: "INFO", message: "hello" }),
      JSON.stringify({ record_id: "2", level: "ERROR", message: "boom" }),
    ]);

    expect(result.records.map((record) => record.record_id)).toEqual(["1", "2"]);
    expect(result.warnings).toEqual([]);
  });

  test("skips malformed lines with a warning", () => {
    const result = parseNdjsonLines(["not json", JSON.stringify({ record_id: "2", level: "ERROR" })]);

    expect(result.records).toHaveLength(1);
    expect(result.warnings[0]).toContain("line 1");
  });

  test("prints explain summary for a matching id", () => {
    const records = parseNdjsonLines([
      JSON.stringify({ record_id: "before", level: "INFO", message: "before" }),
      JSON.stringify({
        record_id: "target",
        level: "ERROR",
        message: "Permission denied creating estimate row",
        error: {
          class: "AuthPermissionDeniedError",
          code: "AUTH_PERMISSION_DENIED",
          stack: ["AuthPermissionDeniedError: denied", "    at createEstimateRow (actions.ts:10:1)"],
        },
        context: { route: "/workshop/projects/p1", server_action: "createEstimateRow" },
      }),
    ]).records;

    const summary = buildExplainSummary(records, "target");

    expect(summary).toContain("AuthPermissionDeniedError");
    expect(summary).toContain("createEstimateRow");
    expect(summary).toContain("/workshop/projects/p1");
    expect(summary).toContain("Top frame:     at createEstimateRow (actions.ts:10:1)");
  });

  test("marks tainted fields as untrusted", () => {
    const records = parseNdjsonLines([
      JSON.stringify({
        record_id: "target",
        level: "ERROR",
        message: "Client report",
        tainted_fields: ["context.message"],
      }),
    ]).records;

    const summary = buildExplainSummary(records, "target");

    expect(summary).toContain("UNTRUSTED_DATA context.message");
  });

  test("filters by level and grep", () => {
    const records = parseNdjsonLines([
      JSON.stringify({ record_id: "1", level: "INFO", message: "AUTH_REQUIRED" }),
      JSON.stringify({ record_id: "2", level: "ERROR", message: "DATABASE_ERROR" }),
    ]).records;

    expect(filterRecords(records, { errorOnly: true }).map((record) => record.record_id)).toEqual(["2"]);
    expect(filterRecords(records, { grep: "AUTH_REQUIRED" }).map((record) => record.record_id)).toEqual(["1"]);
  });

  test("explains the latest error record for debugger agents", () => {
    const records = parseNdjsonLines([
      JSON.stringify({ record_id: "1", level: "ERROR", message: "old", error: { code: "DATABASE_ERROR" } }),
      JSON.stringify({ record_id: "2", level: "INFO", message: "noise" }),
      JSON.stringify({
        record_id: "3",
        level: "ERROR",
        message: "latest",
        error: { class: "InternalError", code: "INTERNAL_ERROR" },
        context: { route: "/workshop", server_action: "saveProject" },
      }),
    ]).records;

    expect(findLatestErrorRecord(records)?.record_id).toBe("3");
    expect(buildLatestErrorSummary(records)).toContain("InternalError INTERNAL_ERROR from saveProject at /workshop");
  });
});
