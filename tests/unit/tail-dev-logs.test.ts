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
    expect(summary).toContain("Likely next step: open the source location in the top frame");
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

  test("classifies Next request connection resets as likely local shutdown artifacts", () => {
    const records = parseNdjsonLines([
      JSON.stringify({
        record_id: "shutdown",
        level: "ERROR",
        event: "next_request_error",
        message: "Next request failed",
        error: {
          class: "InternalError",
          code: "INTERNAL_ERROR",
          cause: {
            name: "TypeError",
            message: "fetch failed",
            cause: {
              name: "Error",
              message: "read ECONNRESET",
              code: "ECONNRESET",
            },
          },
        },
        context: {
          route: "/workshop/projects/[projectId]/estimates/[nodeId]",
          route_type: "render",
          render_source: "react-server-components-payload",
        },
      }),
    ]).records;

    const summary = buildLatestErrorSummary(records);

    expect(summary).toContain("Likely classification: local dev shutdown/restart network abort.");
    expect(summary).toContain("restart dev server and reproduce while it stays running");
    expect(summary).not.toContain("open the source location in the top frame");
  });

  test("classifies route errors from Vitest as test-origin diagnostics", () => {
    const records = parseNdjsonLines([
      JSON.stringify({
        record_id: "route-test",
        timestamp: "2026-07-08T00:00:00.000Z",
        level: "ERROR",
        event: "route_error",
        message: "Something went wrong. Try again in a moment.",
        error: {
          class: "InternalError",
          code: "INTERNAL_ERROR",
          stack: [
            "InternalError: Something went wrong.",
            "    at Module.POST (/repo/src/app/api/share/[token]/decision/route.ts:368:7)",
            "    at /repo/tests/vitest/project-publication-decision.test.tsx:500:19",
            "    at /repo/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20",
          ],
        },
        context: { route: "/api/share/[token]/decision", route_handler: "POST /api/share/[token]/decision" },
      }),
    ]).records;

    const summary = buildLatestErrorSummary(records);

    expect(summary).toContain("Likely classification: test-origin synthetic log record (tests/vitest/project-publication-decision.test.tsx, node_modules/@vitest).");
    expect(summary).toContain("rerun the identified test with a temp ARCHESTIMATOR_DEV_LOG_PATH");
    expect(summary).not.toContain("Likely next step: open the source location in the top frame");
  });

  test("classifies adjacent route diagnostics using nearby test-origin stack evidence", () => {
    const records = parseNdjsonLines([
      JSON.stringify({
        record_id: "route-error",
        timestamp: "2026-07-08T00:00:00.000Z",
        level: "ERROR",
        event: "route_error",
        message: "Something went wrong. Try again in a moment.",
        error: {
          class: "InternalError",
          code: "INTERNAL_ERROR",
          stack: [
            "InternalError: Something went wrong.",
            "    at Module.POST (/repo/src/app/api/share/[token]/decision/route.ts:368:7)",
            "    at /repo/tests/vitest/project-publication-decision.test.tsx:500:19",
            "    at /repo/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20",
          ],
        },
        context: { route: "/api/share/[token]/decision", route_handler: "POST /api/share/[token]/decision" },
      }),
      JSON.stringify({
        record_id: "route-diagnostic",
        timestamp: "2026-07-08T00:00:00.001Z",
        level: "ERROR",
        event: "shared_link_decision_route_event",
        message: "Shared-link decision route diagnostic.",
        context: { route: "/api/share/[token]/decision", error_code: "SUBMIT_FAILED", status: 500 },
      }),
    ]).records;

    const summary = buildLatestErrorSummary(records);

    expect(summary).toContain("Record: route-diagnostic");
    expect(summary).toContain("Likely classification: test-origin synthetic log record (tests/vitest/project-publication-decision.test.tsx, node_modules/@vitest).");
    expect(summary).toContain("rerun the identified test with a temp ARCHESTIMATOR_DEV_LOG_PATH");
    expect(summary).not.toContain("Likely next step: inspect the route or segment for /api/share/[token]/decision");
  });

  test("keeps generic guidance for fetch failures without nested shutdown evidence", () => {
    const records = parseNdjsonLines([
      JSON.stringify({
        record_id: "fetch-failed",
        level: "ERROR",
        event: "next_request_error",
        message: "Next request failed",
        error: {
          class: "InternalError",
          code: "INTERNAL_ERROR",
          cause: {
            name: "TypeError",
            message: "fetch failed",
          },
        },
        context: { route: "/workshop/projects/[projectId]/estimates/[nodeId]" },
      }),
    ]).records;

    const summary = buildLatestErrorSummary(records);

    expect(summary).not.toContain("local dev shutdown/restart network abort");
    expect(summary).toContain("Likely next step: inspect the route or segment");
  });
});
