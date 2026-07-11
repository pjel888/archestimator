import path from "node:path";
import { defineConfig } from "vitest/config";

const performanceReporterEnabled = Boolean(process.env.ESTIMATE_PERF_TEST_OUTPUT_ROLE);

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/vitest/setup.ts"],
    include: ["tests/vitest/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    fileParallelism: false,
    reporters: performanceReporterEnabled
      ? ["default", "./scripts/lib/estimate-sheet-vitest-reporter.ts"]
      : ["default"],
    // The heavy jsdom component suites (e.g. component-library-ui, 60 tests) run
    // serially (fileParallelism:false is load-bearing) and individual tests can
    // exceed 15s late in a ~525s full run under GC pressure — they pass in
    // isolation. 30s accommodates the genuinely-slow tests without weakening any
    // assertion or parallelizing (which would break the perf-suite serial config).
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/vitest/server-only-stub.ts"),
    },
  },
});
