import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { emitLogRecord } from "@/lib/observability/logger";
import {
  createEstimatePerformanceModeSnapshot,
  ESTIMATE_PERFORMANCE_MODE_ENV_KEYS,
  isEstimatePerformanceMode,
  type EstimatePerformanceMode,
  type EstimatePerformanceModeEnvironmentKey,
  type EstimatePerformanceModeSnapshot,
  type EstimatePerformanceModeSnapshotSource,
} from "./estimate-performance-modes";

type ModeEnvironment = Partial<Record<EstimatePerformanceModeEnvironmentKey, string | undefined>>;

export type LoadEstimatePerformanceModeSnapshotOptions = {
  /** Explicit test/runtime input. An explicitly empty object disables context lookup. */
  env?: ModeEnvironment | null;
  /** A directly supplied Cloudflare binding environment, useful for adapter tests. */
  cloudflareEnv?: ModeEnvironment | null;
  /** Optional loader seam for runtime adapter tests. */
  loadCloudflareEnv?: () => Promise<ModeEnvironment | null>;
};

type LoadEstimatePerformanceModeSnapshotInput =
  | ModeEnvironment
  | LoadEstimatePerformanceModeSnapshotOptions;

const MODE_KEYS = Object.entries(ESTIMATE_PERFORMANCE_MODE_ENV_KEYS) as Array<[
  keyof typeof ESTIMATE_PERFORMANCE_MODE_ENV_KEYS,
  EstimatePerformanceModeEnvironmentKey,
]>;

function isOptionsInput(input: LoadEstimatePerformanceModeSnapshotInput): input is LoadEstimatePerformanceModeSnapshotOptions {
  return Object.prototype.hasOwnProperty.call(input, "env")
    || Object.prototype.hasOwnProperty.call(input, "cloudflareEnv")
    || Object.prototype.hasOwnProperty.call(input, "loadCloudflareEnv");
}

function hasModeKey(input: ModeEnvironment) {
  return MODE_KEYS.some(([, envKey]) => Object.prototype.hasOwnProperty.call(input, envKey));
}

function readMode(rawValue: string | undefined, envKey: EstimatePerformanceModeEnvironmentKey, source: EstimatePerformanceModeSnapshotSource) {
  if (rawValue === undefined || rawValue.trim() === "") return "off" as const;
  const normalized = rawValue.trim().toLowerCase();
  if (isEstimatePerformanceMode(normalized)) return normalized;

  // Never include the configured value in diagnostics: this resolver must
  // remain safe if a deployment accidentally uses a secret-like string.
  emitLogRecord({
    level: "error",
    event: "estimate_performance_mode_configuration_error",
    message: "Invalid estimate performance mode; defaulting to off.",
    action: "load_estimate_performance_mode_snapshot",
    context: {
      configuration_key: envKey,
      configuration_source: source,
      reason: "invalid-mode",
    },
  });
  return "off" as const;
}

function snapshotFromEnvironment(
  environment: ModeEnvironment,
  source: EstimatePerformanceModeSnapshotSource,
): EstimatePerformanceModeSnapshot {
  const modes = Object.fromEntries(
    MODE_KEYS.map(([modeKey, envKey]) => [modeKey, readMode(environment[envKey], envKey, source)]),
  ) as Record<keyof typeof ESTIMATE_PERFORMANCE_MODE_ENV_KEYS, EstimatePerformanceMode>;
  return createEstimatePerformanceModeSnapshot({ modes, source });
}

async function loadCloudflareEnv(): Promise<ModeEnvironment | null> {
  try {
    const context = await getCloudflareContext({ async: true });
    return context.env as ModeEnvironment;
  } catch {
    return null;
  }
}

function readProcessEnvironment(): ModeEnvironment {
  return process.env as ModeEnvironment;
}

/**
 * Resolve deployment-scoped estimate performance modes at the server boundary.
 *
 * Cloudflare bindings are preferred. Explicit injected input is available for
 * deterministic tests and local adapters; otherwise Node falls back to the
 * process environment. Missing values are intentionally quiet and all become
 * `off`. Invalid values are logged without their raw contents and become `off`.
 */
export async function loadEstimatePerformanceModeSnapshot(
  input?: LoadEstimatePerformanceModeSnapshotInput,
): Promise<EstimatePerformanceModeSnapshot> {
  // `undefined` means the live server adapter should resolve Cloudflare, then
  // process.env. An explicit empty map is instead a deterministic injected
  // all-off snapshot for tests and local adapters.
  if (input === undefined) {
    const cloudflareEnv = await loadCloudflareEnv();
    if (cloudflareEnv) return snapshotFromEnvironment(cloudflareEnv, "cloudflare");
    return snapshotFromEnvironment(readProcessEnvironment(), "process.env");
  }

  if (isOptionsInput(input)) {
    if (input.cloudflareEnv !== undefined) {
      return snapshotFromEnvironment(input.cloudflareEnv ?? {}, "cloudflare");
    }
    if (input.env !== undefined) {
      return snapshotFromEnvironment(input.env ?? {}, "injected");
    }
    if (input.loadCloudflareEnv) {
      const cloudflareEnv = await input.loadCloudflareEnv();
      if (cloudflareEnv) return snapshotFromEnvironment(cloudflareEnv, "cloudflare");
    }
  } else if (hasModeKey(input)) {
    return snapshotFromEnvironment(input, "injected");
  }

  return snapshotFromEnvironment({}, "injected");
}
