import { defineConfig, devices, type ReporterDescription } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

const port = process.env.PLAYWRIGHT_PORT ?? "3020";
const baseURL = `http://127.0.0.1:${port}`;
const isolatedDevelopmentDistDir = `.next/playwright-${port}`;
const libraryBrowserMatrixEnabled = process.env.ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX === "1";
const ciReporters: ReporterDescription[] = [
  ["blob", { outputDir: "artifacts/playwright/blob" }],
  ["html", { open: "never", outputFolder: "artifacts/playwright/html" }],
];
const localReporters: ReporterDescription[] = [
  ["list"],
  ["html", { open: "never", outputFolder: "artifacts/playwright/html" }],
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
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: true,
  retries: 0,
  reporter: process.env.CI ? ciReporters : localReporters,
  outputDir: "artifacts/playwright/test-results",
  use: {
    baseURL,
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `bun run predev && ARCHESTIMATOR_NEXT_DEV_DIST_DIR=${isolatedDevelopmentDistDir} bun x next dev --webpack --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: libraryBrowserMatrixEnabled
    ? [...defaultProjects, ...libraryBrowserMatrixProjects]
    : defaultProjects,
});
