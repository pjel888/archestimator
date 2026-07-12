import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

import { resolvePreparedEstimateBrowserRuntime } from "./e2e/helpers/estimate-sheet-performance-runtime";
import {
  readAuthoritativeRunManifest,
  readJsonFile,
  resolveRunManifestPath,
} from "./scripts/lib/estimate-sheet-performance-contract";

loadEnvConfig(process.cwd(), true);

const unit = process.env.ESTIMATE_PERF_UNIT?.trim();
const preparedRuntime = unit
  ? (() => {
    const manifestPath = resolveRunManifestPath(process.cwd(), unit, process.env.ESTIMATE_PERF_RUN_MANIFEST);
    const run = readAuthoritativeRunManifest(process.cwd(), manifestPath, unit as typeof unit);
    if (!run.activePreview?.path) throw new Error("prepared benchmark run has no active preview descriptor");
    return resolvePreparedEstimateBrowserRuntime(run, readJsonFile(run.activePreview.path));
  })()
  : null;
const port = process.env.ESTIMATE_PERF_PORT ?? "3190";

if (preparedRuntime) {
  process.env.ESTIMATE_PERF_E2E = "1";
  process.env.ESTIMATE_PERF_BASE_URL = preparedRuntime.baseURL;
  process.env.ESTIMATE_PERF_PROJECT_ID = preparedRuntime.projectId;
  process.env.ESTIMATE_PERF_NODE_ID = preparedRuntime.nodeId;
  process.env.PLAYWRIGHT_STORAGE_STATE = preparedRuntime.storageState;
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["./e2e/helpers/estimate-sheet-performance-reporter.ts"],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: preparedRuntime?.baseURL ?? process.env.ESTIMATE_PERF_BASE_URL ?? `http://127.0.0.1:${port}`,
    storageState: preparedRuntime?.storageState ?? (process.env.PLAYWRIGHT_STORAGE_STATE || undefined),
    viewport: { width: 1_440, height: 900 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  // The evaluator must consume the prepared, authenticated preview and never
  // start an implicit dev server that could contaminate performance evidence.
  webServer: undefined,
});
