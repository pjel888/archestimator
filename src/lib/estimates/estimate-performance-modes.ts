/**
 * Client-safe deployment modes for the estimate-sheet performance work.
 *
 * This module intentionally contains no environment or server imports. The
 * snapshot is observability/rollback plumbing only; optimized behavior is
 * owned by the units that consume each mode after their evidence gates pass.
 */

export const ESTIMATE_PERFORMANCE_MODE_SNAPSHOT_SCHEMA_VERSION =
  "estimate-performance-mode-snapshot.v1" as const;

export const ESTIMATE_PERFORMANCE_MODE_KEYS = [
  "routeFastPath",
  "graph",
  "incrementalDerivation",
  "renderBoundary",
  "entityPatch",
] as const;

export type EstimatePerformanceModeKey = (typeof ESTIMATE_PERFORMANCE_MODE_KEYS)[number];
export type EstimatePerformanceMode = "off" | "shadow" | "on";

export type EstimatePerformanceModeValues = Readonly<{
  routeFastPath: EstimatePerformanceMode;
  graph: EstimatePerformanceMode;
  incrementalDerivation: EstimatePerformanceMode;
  renderBoundary: EstimatePerformanceMode;
  entityPatch: EstimatePerformanceMode;
}>;

export type EstimatePerformanceModeSnapshotSource =
  | "cloudflare"
  | "injected"
  | "process.env"
  | "default";

/**
 * A versioned, serializable, non-secret deployment snapshot.
 *
 * The direct key accessors are non-enumerable compatibility views over
 * `modes`; serialized evidence and DOM metadata use the stable nested shape.
 */
export type EstimatePerformanceModeSnapshot = Readonly<{
  schemaVersion: typeof ESTIMATE_PERFORMANCE_MODE_SNAPSHOT_SCHEMA_VERSION;
  version: 1;
  source: EstimatePerformanceModeSnapshotSource;
  modes: EstimatePerformanceModeValues;
  routeFastPath: EstimatePerformanceMode;
  graph: EstimatePerformanceMode;
  incrementalDerivation: EstimatePerformanceMode;
  renderBoundary: EstimatePerformanceMode;
  entityPatch: EstimatePerformanceMode;
}>;

export const ESTIMATE_PERFORMANCE_MODE_ENV_KEYS = {
  routeFastPath: "ESTIMATE_ROUTE_FAST_PATH_MODE",
  graph: "ESTIMATE_GRAPH_MODE",
  incrementalDerivation: "ESTIMATE_INCREMENTAL_DERIVATION_MODE",
  renderBoundary: "ESTIMATE_RENDER_BOUNDARY_MODE",
  entityPatch: "ESTIMATE_ENTITY_PATCH_MODE",
} as const;

export type EstimatePerformanceModeEnvironmentKey =
  (typeof ESTIMATE_PERFORMANCE_MODE_ENV_KEYS)[keyof typeof ESTIMATE_PERFORMANCE_MODE_ENV_KEYS];

export const ESTIMATE_PERFORMANCE_MODE_ENV_KEY_LIST = Object.freeze(
  Object.values(ESTIMATE_PERFORMANCE_MODE_ENV_KEYS),
);

export const ESTIMATE_PERFORMANCE_MODE_VALUES = ["off", "shadow", "on"] as const;

export function isEstimatePerformanceMode(value: unknown): value is EstimatePerformanceMode {
  return value === "off" || value === "shadow" || value === "on";
}

export function normalizeEstimatePerformanceMode(value: unknown): EstimatePerformanceMode {
  if (typeof value !== "string") return "off";
  const normalized = value.trim().toLowerCase();
  return isEstimatePerformanceMode(normalized) ? normalized : "off";
}

export function createEstimatePerformanceModeSnapshot({
  modes,
  source = "default",
}: {
  modes?: Partial<EstimatePerformanceModeValues>;
  source?: EstimatePerformanceModeSnapshotSource;
} = {}): EstimatePerformanceModeSnapshot {
  const resolvedModes: EstimatePerformanceModeValues = Object.freeze({
    routeFastPath: normalizeEstimatePerformanceMode(modes?.routeFastPath),
    graph: normalizeEstimatePerformanceMode(modes?.graph),
    incrementalDerivation: normalizeEstimatePerformanceMode(modes?.incrementalDerivation),
    renderBoundary: normalizeEstimatePerformanceMode(modes?.renderBoundary),
    entityPatch: normalizeEstimatePerformanceMode(modes?.entityPatch),
  });

  const snapshot = {
    schemaVersion: ESTIMATE_PERFORMANCE_MODE_SNAPSHOT_SCHEMA_VERSION,
    version: 1 as const,
    source,
    modes: resolvedModes,
  } as EstimatePerformanceModeSnapshot;

  // Keep the serialized contract small while allowing future consumers to use
  // the individual mode names without reaching into the nested map.
  Object.defineProperties(snapshot, {
    routeFastPath: { enumerable: false, get: () => resolvedModes.routeFastPath },
    graph: { enumerable: false, get: () => resolvedModes.graph },
    incrementalDerivation: { enumerable: false, get: () => resolvedModes.incrementalDerivation },
    renderBoundary: { enumerable: false, get: () => resolvedModes.renderBoundary },
    entityPatch: { enumerable: false, get: () => resolvedModes.entityPatch },
  });

  return Object.freeze(snapshot);
}

/** A stable baseline used by callers that do not receive a route snapshot. */
export const ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT = createEstimatePerformanceModeSnapshot();

export function getEstimatePerformanceModeMetadata(snapshot: EstimatePerformanceModeSnapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    source: snapshot.source,
    routeFastPath: snapshot.modes.routeFastPath,
    graph: snapshot.modes.graph,
    incrementalDerivation: snapshot.modes.incrementalDerivation,
    renderBoundary: snapshot.modes.renderBoundary,
    entityPatch: snapshot.modes.entityPatch,
  } as const;
}
