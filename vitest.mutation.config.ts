import path from "node:path";

import { defineConfig } from "vitest/config";

const requiredTests = JSON.parse(
  process.env.ARCHESTIMATOR_MUTATION_REQUIRED_TESTS ?? "[]",
) as string[];
const exactTests = JSON.parse(
  process.env.ARCHESTIMATOR_MUTATION_EXACT_TESTS ?? "[]",
) as string[];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/vitest/server-only-stub.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/vitest/setup.ts"],
    fileParallelism: false,
    include: exactTests.length > 0
      ? exactTests
      : requiredTests.length > 0
        ? requiredTests
        : [
            "tests/vitest/**/*.test.{ts,tsx}",
            "tests/property/**/*.test.{ts,tsx}",
          ],
    maxWorkers: 1,
    testTimeout: 30_000,
  },
});
