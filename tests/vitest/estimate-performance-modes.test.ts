import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(async () => {
    throw new Error("Cloudflare context unavailable in Vitest");
  }),
}));

import {
  ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT,
  createEstimatePerformanceModeSnapshot,
  ESTIMATE_PERFORMANCE_MODE_ENV_KEYS,
  ESTIMATE_PERFORMANCE_MODE_SNAPSHOT_SCHEMA_VERSION,
  getEstimatePerformanceModeMetadata,
  normalizeEstimatePerformanceMode,
} from "@/lib/estimates/estimate-performance-modes";
import { loadEstimatePerformanceModeSnapshot } from "@/lib/estimates/estimate-performance-modes.server";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("estimate performance mode snapshot", () => {
  it("provides an immutable versioned all-off fallback with stable metadata", () => {
    expect(ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT).toMatchObject({
      schemaVersion: ESTIMATE_PERFORMANCE_MODE_SNAPSHOT_SCHEMA_VERSION,
      version: 1,
      source: "default",
      modes: {
        routeFastPath: "off",
        graph: "off",
        incrementalDerivation: "off",
        renderBoundary: "off",
        entityPatch: "off",
      },
    });
    expect(ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT.routeFastPath).toBe("off");
    expect(Object.isFrozen(ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT)).toBe(true);
    expect(Object.isFrozen(ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT.modes)).toBe(true);
    expect(getEstimatePerformanceModeMetadata(ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT)).toEqual({
      schemaVersion: ESTIMATE_PERFORMANCE_MODE_SNAPSHOT_SCHEMA_VERSION,
      source: "default",
      routeFastPath: "off",
      graph: "off",
      incrementalDerivation: "off",
      renderBoundary: "off",
      entityPatch: "off",
    });
  });

  it("normalizes only the supported deployment modes", () => {
    expect(normalizeEstimatePerformanceMode("off")).toBe("off");
    expect(normalizeEstimatePerformanceMode(" SHADOW ")).toBe("shadow");
    expect(normalizeEstimatePerformanceMode("ON")).toBe("on");
    expect(normalizeEstimatePerformanceMode(undefined)).toBe("off");
    expect(normalizeEstimatePerformanceMode("invalid-mode")).toBe("off");
  });

  it("keeps the nested mode map and direct compatibility accessors in sync", () => {
    const snapshot = createEstimatePerformanceModeSnapshot({
      source: "injected",
      modes: {
        routeFastPath: "shadow",
        graph: "on",
        incrementalDerivation: "off",
        renderBoundary: "on",
        entityPatch: "shadow",
      },
    });

    expect(snapshot.modes).toEqual({
      routeFastPath: "shadow",
      graph: "on",
      incrementalDerivation: "off",
      renderBoundary: "on",
      entityPatch: "shadow",
    });
    expect(snapshot.routeFastPath).toBe(snapshot.modes.routeFastPath);
    expect(snapshot.graph).toBe(snapshot.modes.graph);
    expect(snapshot.incrementalDerivation).toBe(snapshot.modes.incrementalDerivation);
    expect(snapshot.renderBoundary).toBe(snapshot.modes.renderBoundary);
    expect(snapshot.entityPatch).toBe(snapshot.modes.entityPatch);
  });
});

describe("server-only estimate performance mode resolution", () => {
  it("resolves all five keys from injected server input", async () => {
    const snapshot = await loadEstimatePerformanceModeSnapshot({
      env: {
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.routeFastPath]: "shadow",
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.graph]: "on",
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.incrementalDerivation]: "off",
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.renderBoundary]: "ON",
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.entityPatch]: "shadow",
      },
    });

    expect(snapshot.source).toBe("injected");
    expect(snapshot.modes).toEqual({
      routeFastPath: "shadow",
      graph: "on",
      incrementalDerivation: "off",
      renderBoundary: "on",
      entityPatch: "shadow",
    });
  });

  it("prefers explicit Cloudflare input over injected input and loader seams", async () => {
    const loader = vi.fn(async () => ({
      [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.graph]: "shadow",
    }));

    const snapshot = await loadEstimatePerformanceModeSnapshot({
      cloudflareEnv: {
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.graph]: "on",
      },
      env: {
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.graph]: "off",
      },
      loadCloudflareEnv: loader,
    });

    expect(snapshot.source).toBe("cloudflare");
    expect(snapshot.graph).toBe("on");
    expect(loader).not.toHaveBeenCalled();
  });

  it("uses the Cloudflare loader seam when direct environments are absent", async () => {
    const snapshot = await loadEstimatePerformanceModeSnapshot({
      loadCloudflareEnv: async () => ({
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.entityPatch]: "on",
      }),
    });

    expect(snapshot.source).toBe("cloudflare");
    expect(snapshot.entityPatch).toBe("on");
    expect(snapshot.routeFastPath).toBe("off");
  });

  it("keeps an explicit empty map all-off and does not consult process.env", async () => {
    vi.stubEnv(ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.graph, "on");

    const snapshot = await loadEstimatePerformanceModeSnapshot({});

    expect(snapshot.source).toBe("injected");
    expect(snapshot.graph).toBe("off");
    expect(snapshot.modes).toEqual({
      routeFastPath: "off",
      graph: "off",
      incrementalDerivation: "off",
      renderBoundary: "off",
      entityPatch: "off",
    });
  });

  it("falls back to process.env only when no input is supplied", async () => {
    vi.stubEnv(ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.graph, "shadow");

    const snapshot = await loadEstimatePerformanceModeSnapshot({
      loadCloudflareEnv: async () => null,
    });

    // An options object with a null loader is deterministic injected fallback;
    // the no-input path below is the process.env adapter contract.
    expect(snapshot.source).toBe("injected");

    const processSnapshot = await loadEstimatePerformanceModeSnapshot();
    expect(["cloudflare", "process.env"]).toContain(processSnapshot.source);
    if (processSnapshot.source === "process.env") {
      expect(processSnapshot.graph).toBe("shadow");
    }
  });

  it("defaults missing values to off and logs invalid values without raw contents", async () => {
    const invalidValue = "secret-like-invalid-mode-value";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const snapshot = await loadEstimatePerformanceModeSnapshot({
      env: {
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.routeFastPath]: invalidValue,
        [ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.graph]: "",
      },
    });

    expect(snapshot.routeFastPath).toBe("off");
    expect(snapshot.graph).toBe("off");
    expect(consoleError).toHaveBeenCalledTimes(1);
    const logRecord = JSON.parse(String(consoleError.mock.calls[0]?.[0])) as {
      event?: string;
      context?: { configuration_key?: string; reason?: string };
    };
    expect(logRecord).toMatchObject({
      event: "estimate_performance_mode_configuration_error",
      context: {
        configuration_key: ESTIMATE_PERFORMANCE_MODE_ENV_KEYS.routeFastPath,
        reason: "invalid-mode",
      },
    });
    expect(String(consoleError.mock.calls[0]?.[0])).not.toContain(invalidValue);
  });

  it("does not expose public environment-key access in the server resolver", async () => {
    const source = readFileSync("src/lib/estimates/estimate-performance-modes.server.ts", "utf8");

    expect(source).toContain('import "server-only";');
    expect(source).toContain('getCloudflareContext({ async: true })');
    expect(source).not.toContain("NEXT_PUBLIC_");
  });
});
