import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/vitest/setup.ts"],
    include: ["tests/vitest/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    fileParallelism: false,
    // The heavy jsdom component suites (e.g. component-library-ui, 60 tests) run
    // serially (fileParallelism:false is load-bearing) and individual tests can
    // exceed 15s late in a ~525s full run under GC pressure — they pass in
    // isolation. 30s accommodates the genuinely-slow tests without weakening any
    // assertion or parallelizing (which would break the perf-suite serial config).
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reportsDirectory: "artifacts/coverage/component",
      reporter: ["text", "json", "json-summary", "lcov"],
      exclude: [
        "cloudflare-env.d.ts",
        "next-env.d.ts",
        "tests/**",
        "**/*.d.ts",
        "**/*.stories.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/vitest/server-only-stub.ts"),
    },
  },
});
