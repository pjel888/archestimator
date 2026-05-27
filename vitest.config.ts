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
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/vitest/server-only-stub.ts"),
    },
  },
});
