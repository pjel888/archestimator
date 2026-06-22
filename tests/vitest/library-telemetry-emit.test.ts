import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  recordLibraryEvent,
  setLibraryTelemetrySink,
  type LibraryTelemetryPayload,
  type LibraryTelemetryRecord,
} from "@/lib/component-library/library-telemetry";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("library telemetry", () => {
  afterEach(() => {
    setLibraryTelemetrySink(null);
  });

  it("emits schema-versioned records through the registered beta sink in tests", () => {
    const sink = vi.fn();
    setLibraryTelemetrySink(sink);

    recordLibraryEvent("route_state_authz_denied", {
      workspaceId: "workspace-1",
      resourceKind: "component",
      reason: "not_found",
    });

    expect(sink).toHaveBeenCalledWith({
      schemaVersion: "v1",
      event: "route_state_authz_denied",
      workspaceId: "workspace-1",
      resourceKind: "component",
      reason: "not_found",
    });
  });

  it("swallows sink failures so telemetry cannot break the Library path", () => {
    setLibraryTelemetrySink(() => {
      throw new Error("sink unavailable");
    });

    expect(() => recordLibraryEvent("quick_add_started", {
      workspaceId: "workspace-1",
      sessionAddId: "quick-add-1",
      entry: "button",
    })).not.toThrow();
  });

  it("drops private or free-text payload keys at runtime", () => {
    const records: LibraryTelemetryRecord[] = [];
    setLibraryTelemetrySink((record) => {
      records.push(record);
    });

    recordLibraryEvent("quick_add_failed", {
      workspaceId: "workspace-1",
      sessionAddId: "quick-add-1",
      reason: "validation_error",
      name: "Walnut cabinet",
      query: "cabinet supplier",
      price: 1200,
      pricingSource: "Supplier quote",
      confidence: "Verified invoice",
    } as LibraryTelemetryPayload & Record<string, unknown>);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      schemaVersion: "v1",
      event: "quick_add_failed",
      workspaceId: "workspace-1",
      sessionAddId: "quick-add-1",
      reason: "validation_error",
    });
    expect(Object.keys(records[0] ?? {})).not.toEqual(
      expect.arrayContaining(["name", "query", "price", "pricingSource", "pricing_source", "confidence"]),
    );
  });

  it("keeps Library telemetry out of public share routes", () => {
    expect(source("src/app/share/[token]/page.tsx")).not.toContain("recordLibraryEvent");
    expect(source("src/app/api/share/[token]/route.ts")).not.toContain("recordLibraryEvent");
  });
});
