import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

const port = process.env.PLAYWRIGHT_PORT ?? "3020";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `bun run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
