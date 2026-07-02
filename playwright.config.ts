import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

const port = process.env.PLAYWRIGHT_PORT ?? "3020";
const baseURL = `http://127.0.0.1:${port}`;
const libraryBrowserMatrixEnabled = process.env.ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX === "1";
const legacySupabaseE2EEnabled = process.env.ARCHESTIMATOR_E2E_ENABLE_LEGACY_SUPABASE === "1";

const legacySupabaseE2ESpecs = [
  "ask-flip-package-builder-live.spec.ts",
  "estimate-row-move.spec.ts",
  "estimate-sheet-interaction-performance.spec.ts",
  "estimate-sheet-loading-performance.spec.ts",
  "estimate-sheet-offline.spec.ts",
  "estimate-sheet-owner-gated-full-matrix.spec.ts",
  "estimate-sheet-target-route-smoke.spec.ts",
  "estimate-sources-drawer.spec.ts",
  "estimate-tabs.spec.ts",
  "estimate-tree-dnd.spec.ts",
  "notifications-center.spec.ts",
  "notifications-release-modal.spec.ts",
  "project-invite-entry.spec.ts",
  "publisher-access-mode.spec.ts",
  "publisher-accessibility.spec.ts",
  "publisher-drawer.spec.ts",
  "publisher-roster.spec.ts",
  "teamspace-collaboration.spec.ts",
  "workshop-library-routes.spec.ts",
  "workshop-project-specific-unlink-smoke.spec.ts",
  "workshop-template-insert-smoke.spec.ts",
];

const defaultProjects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
];

const libraryBrowserMatrixProjects = [
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "mobile-safari",
    use: { ...devices["iPhone 15"] },
  },
  {
    name: "iphone-se",
    use: { ...devices["iPhone SE"] },
  },
  {
    name: "ipad",
    use: { ...devices["iPad Pro 11"] },
  },
  {
    name: "pixel-8-chrome",
    use: {
      ...devices["Pixel 7"],
      viewport: { width: 412, height: 915 },
    },
  },
];

export default defineConfig({
  testDir: "./e2e",
  testIgnore: legacySupabaseE2EEnabled ? [] : legacySupabaseE2ESpecs,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined,
    trace: "on-first-retry",
  },
  webServer: {
    command: `bun run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: libraryBrowserMatrixEnabled
    ? [...defaultProjects, ...libraryBrowserMatrixProjects]
    : defaultProjects,
});
