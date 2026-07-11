import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

const port = process.env.ESTIMATE_PERF_PORT ?? "3190";

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
    baseURL: process.env.ESTIMATE_PERF_BASE_URL ?? `http://127.0.0.1:${port}`,
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined,
    viewport: { width: 1_440, height: 900 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  // The evaluator must consume the prepared, authenticated preview and never
  // start an implicit dev server that could contaminate performance evidence.
  webServer: undefined,
});

