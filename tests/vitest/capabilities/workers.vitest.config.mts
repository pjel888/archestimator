import path from "node:path";

import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./tests/workers/local-bindings.worker.ts",
      remoteBindings: false,
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["tests/workers/**/*.integration.test.ts"],
    fileParallelism: false,
    isolate: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "istanbul",
      reportsDirectory: "artifacts/coverage/workers",
      reporter: ["text", "json", "lcov"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../../src"),
      "server-only": path.resolve(
        __dirname,
        "../../../node_modules/server-only/empty.js",
      ),
    },
  },
});
