import type { RunManifestV1 } from "../../scripts/lib/estimate-sheet-performance-contract";

type ActivePreview = Readonly<{
  active?: unknown;
  readiness?: unknown;
  port?: unknown;
}>;

export type PreparedEstimateBrowserRuntime = Readonly<{
  baseURL: string;
  projectId: string;
  nodeId: string;
  storageState: string;
}>;

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${label} is required`);
  return value;
}

function reconcileEnv(value: string, expected: string, label: string): string {
  if (value && value !== expected) throw new Error(`${label} conflicts with the prepared benchmark run`);
  return expected;
}

/** Resolves the sole active browser target from the prepared run, not ambient shell state. */
export function resolvePreparedEstimateBrowserRuntime(
  run: RunManifestV1,
  activePreview: ActivePreview,
  env: NodeJS.ProcessEnv = process.env,
): PreparedEstimateBrowserRuntime {
  const projectId = requiredString(run.route.projectId, "prepared route project id");
  const nodeId = requiredString(run.route.nodeId, "prepared route node id");
  const storageState = requiredString(run.storageState, "prepared storage state");
  if (activePreview.active !== true || activePreview.readiness !== "READY") {
    throw new Error("prepared benchmark preview is not ready");
  }
  if (!Number.isInteger(activePreview.port) || Number(activePreview.port) < 1 || Number(activePreview.port) > 65_535) {
    throw new Error("prepared benchmark preview port is invalid");
  }

  const baseURL = `http://127.0.0.1:${activePreview.port}`;
  return {
    baseURL: reconcileEnv(env.ESTIMATE_PERF_BASE_URL ?? "", baseURL, "ESTIMATE_PERF_BASE_URL"),
    projectId: reconcileEnv(env.ESTIMATE_PERF_PROJECT_ID ?? "", projectId, "ESTIMATE_PERF_PROJECT_ID"),
    nodeId: reconcileEnv(env.ESTIMATE_PERF_NODE_ID ?? "", nodeId, "ESTIMATE_PERF_NODE_ID"),
    storageState: reconcileEnv(env.PLAYWRIGHT_STORAGE_STATE ?? "", storageState, "PLAYWRIGHT_STORAGE_STATE"),
  };
}
