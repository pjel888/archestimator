import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  ESTIMATE_MUTATION_TELEMETRY_EVENTS,
  ESTIMATE_MUTATION_TELEMETRY_SAFE_PAYLOAD_KEYS,
  buildEstimateMutationTelemetryRecord,
} from "@/lib/estimates/estimate-mutation-telemetry";

describe("estimate mutation telemetry", () => {
  it("keeps row mutation telemetry payloads allow-listed and free of row/source/image content", () => {
    const record = buildEstimateMutationTelemetryRecord("mutation_failed", {
      operation: "update_row",
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      mutationId: "mutation-1",
      rowCount: 1,
      durationMs: 12.4,
      reason: "network timeout",
      retryable: true,
      material: "Sensitive material name",
      description: "Sensitive row description",
      sourceSnapshot: { imageUrl: "https://example.test/private.png" },
      imageUrl: "https://example.test/private.png",
      libraryItem: { material: "Library payload" },
      rowPayload: { unitCost: 123 },
    });

    expect(record).toMatchObject({
      schemaVersion: "v1",
      event: "mutation_failed",
      operation: "update_row",
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      mutationId: "mutation-1",
      rowCount: 1,
      durationMs: 12,
      reason: "network timeout",
      retryable: true,
    });
    expect(record).not.toHaveProperty("material");
    expect(record).not.toHaveProperty("description");
    expect(record).not.toHaveProperty("sourceSnapshot");
    expect(record).not.toHaveProperty("imageUrl");
    expect(record).not.toHaveProperty("libraryItem");
    expect(record).not.toHaveProperty("rowPayload");
  });

  it("declares the release-monitoring event classes needed for estimate sheet owner gates", () => {
    expect(ESTIMATE_MUTATION_TELEMETRY_EVENTS).toEqual(expect.arrayContaining([
      "mutation_requested",
      "mutation_succeeded",
      "mutation_failed",
      "mutation_conflict",
      "mutation_offline_retryable",
      "mutation_pending_age_escalated",
      "cache_refetch_queued",
      "authz_denied",
      "rate_limited",
    ]));
    expect(ESTIMATE_MUTATION_TELEMETRY_SAFE_PAYLOAD_KEYS).not.toEqual(expect.arrayContaining([
      "material",
      "description",
      "sourceSnapshot",
      "imageUrl",
      "libraryItem",
      "rowPayload",
    ]));
  });

  it("wires mutation counters, cache refetch reasons, and direct-action denial counters into the estimate mutation surfaces", () => {
    const hookSource = readFileSync("src/hooks/use-estimate-row-mutations.ts", "utf8");
    const actionSource = readFileSync("src/lib/estimates/actions.ts", "utf8");

    expect(hookSource).toContain("mutation_requested");
    expect(hookSource).toContain("mutation_succeeded");
    expect(hookSource).toContain("mutation_failed");
    expect(hookSource).toContain("mutation_conflict");
    expect(hookSource).toContain("mutation_offline_retryable");
    expect(hookSource).toContain("mutation_pending_age_escalated");
    expect(hookSource).toContain("cache_refetch_queued");
    expect(actionSource).toContain("authz_denied");
    expect(actionSource).toContain("rate_limited");
  });
});
