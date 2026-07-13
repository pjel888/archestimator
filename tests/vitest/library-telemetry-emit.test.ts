import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  recordLibraryEvent,
  sanitizeLibraryTelemetryRecord,
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

  it("swallows async sink rejections so telemetry cannot break the Library path", async () => {
    const rejection = vi.fn();
    const originalUnhandled = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", rejection);
    setLibraryTelemetrySink(() => Promise.reject(new Error("sink unavailable")));

    expect(() => recordLibraryEvent("quick_add_started", {
      workspaceId: "workspace-1",
      sessionAddId: "quick-add-1",
      entry: "button",
    })).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.removeListener("unhandledRejection", rejection);
    for (const listener of originalUnhandled) process.on("unhandledRejection", listener);
    expect(rejection).not.toHaveBeenCalled();
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
      expect.arrayContaining(["name", "query", "price", "pricingSource", "pricing_source"]),
    );
  });

  it("redacts unsafe values even when they are sent through allowed keys", () => {
    const records: LibraryTelemetryRecord[] = [];
    setLibraryTelemetrySink((record) => {
      records.push(record);
    });

    recordLibraryEvent("telemetry_pii_leak", {
      workspaceId: "workspace-1",
      projectId: "https://example.com/private-source",
      cacheKey: "component-library/storage_path/workspace/file.pdf",
      origin: "https://supplier.example/quote.pdf?token=secret",
      endpoint: "/api/private/download?signature=abc",
      attemptedValue: "private note: supplier quoted client-only terms",
      pattern: "supplier quoted client only terms",
      field: "source review note",
      componentId: "component-1",
      reason: "redaction_regression",
      nested: { sourceUrl: "https://example.com" },
      list: ["invoice.pdf"],
    } as LibraryTelemetryPayload & Record<string, unknown>);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      schemaVersion: "v1",
      event: "telemetry_pii_leak",
      workspaceId: "workspace-1",
      componentId: "component-1",
      reason: "redaction_regression",
    });
    const serialized = JSON.stringify(records[0]);
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("storage_path");
    expect(serialized).not.toContain("quote.pdf");
    expect(serialized).not.toContain("signature=");
    expect(serialized).not.toContain("private note");
    expect(serialized).not.toContain("supplier quoted client");
    expect(serialized).not.toContain("source review note");
    expect(serialized).not.toContain("invoice.pdf");
    expect(Object.keys(records[0] ?? {})).not.toEqual(expect.arrayContaining(["nested", "list"]));
  });

  it("does not emit raw project-source search query text", () => {
    const records: LibraryTelemetryRecord[] = [];
    setLibraryTelemetrySink((record) => {
      records.push(record);
    });

    recordLibraryEvent("search_rate_anomaly", {
      workspaceId: "workspace-1",
      surface: "templates",
      inputLength: 14,
      inputCategory: "project_source",
      query: "private villa",
      rawQuery: "private villa",
    } as LibraryTelemetryPayload & Record<string, unknown>);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      schemaVersion: "v1",
      event: "search_rate_anomaly",
      workspaceId: "workspace-1",
      surface: "templates",
      inputLength: 14,
      inputCategory: "project_source",
    });
    expect(JSON.stringify(records[0])).not.toContain("private villa");
    expect(Object.keys(records[0] ?? {})).not.toEqual(expect.arrayContaining(["query", "rawQuery"]));
  });

  it("re-sanitizes untrusted records before durable telemetry writes", () => {
    const record = sanitizeLibraryTelemetryRecord({
      schemaVersion: "v1",
      event: "quick_add_failed",
      workspaceId: "workspace-1",
      reason: "validation_error",
      sourceUrl: "https://supplier.example/private.pdf?token=secret",
      query: "client penthouse marble",
      nested: { fileName: "invoice.pdf" },
    });

    expect(record).toEqual({
      schemaVersion: "v1",
      event: "quick_add_failed",
      workspaceId: "workspace-1",
      reason: "validation_error",
    });
  });

  it("rejects unknown telemetry event names before durable writes", () => {
    expect(sanitizeLibraryTelemetryRecord({
      schemaVersion: "v1",
      event: "unknown_event",
      workspaceId: "workspace-1",
    })).toBeNull();
  });

  it("keeps Library telemetry out of public share routes", () => {
    expect(source("src/app/share/[token]/page.tsx")).not.toContain("recordLibraryEvent");
    expect(source("src/app/api/share/[token]/route.ts")).not.toContain("recordLibraryEvent");
  });
});
