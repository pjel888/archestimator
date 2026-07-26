import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isSupportedNodeVersion } from "../../scripts/check-node-version.mjs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  engines?: { node?: string };
  scripts?: Record<string, string>;
};
const instrumentationSource = readFileSync("src/instrumentation.ts", "utf8");
const nodeInstrumentationSource = readFileSync("src/instrumentation.node.ts", "utf8");
const nextConfigSource = readFileSync("next.config.ts", "utf8");
const redactionSource = readFileSync("src/lib/observability/redact.ts", "utf8");

describe("development runtime memory safety", () => {
  it("uses bounded Turbopack by default with persistent caching disabled", () => {
    expect(packageJson.scripts?.dev).toContain("--max-old-space-size=2048");
    expect(packageJson.scripts?.dev).toContain("next dev --turbopack");
    expect(packageJson.scripts?.dev).not.toContain("--webpack");
    expect(packageJson.scripts?.["dev:turbo"]).toContain("--max-old-space-size=2048");
    expect(packageJson.scripts?.["dev:turbo"]).toContain("next dev --turbopack");
    expect(nextConfigSource).not.toContain("webpackMemoryOptimizations");
    expect(nextConfigSource).toContain("turbopackFileSystemCacheForDev: false");
    expect(nextConfigSource).toContain("turbopackMemoryLimit: 1536 * 1024 * 1024");
  });

  it("enforces supported Node LTS release lines before development", () => {
    expect(packageJson.engines?.node).toBe("^22.12.0 || ^24.0.0 || ^26.0.0");
    expect(readFileSync(".nvmrc", "utf8").trim()).toBe("24");
    expect(packageJson.scripts?.predev).toBe("node scripts/check-node-version.mjs && bun run dev:check-d1-migrations");
    expect(packageJson.scripts?.["predev:turbo"]).toBe("node scripts/check-node-version.mjs && bun run dev:check-d1-migrations");
    expect(packageJson.scripts?.["dev:check-d1-migrations"]).toBe("bun run scripts/check-cloudflare-d1-migrations.ts --local");
    expect(packageJson.scripts?.["pretype-check"]).toBe("node scripts/check-node-version.mjs");
    expect(packageJson.scripts?.["type-check"]).toContain("--max-old-space-size=4096");
    expect(isSupportedNodeVersion("22.11.0")).toBe(false);
    expect(isSupportedNodeVersion("22.12.0")).toBe(true);
    expect(isSupportedNodeVersion("24.14.0")).toBe(true);
    // Odd (non-LTS) majors are never supported.
    expect(isSupportedNodeVersion("23.0.0")).toBe(false);
    expect(isSupportedNodeVersion("25.0.0")).toBe(false);
    // Even majors >= 24 are LTS release lines and supported (24, 26, 28, ...).
    expect(isSupportedNodeVersion("26.0.0")).toBe(true);
    expect(isSupportedNodeVersion("28.0.0")).toBe(true);
  });

  it("isolates Node-only observability from the shared instrumentation bundle", () => {
    expect(instrumentationSource).toContain('if (process.env.NEXT_RUNTIME === "nodejs")');
    expect(instrumentationSource).toContain('import("./instrumentation.node")');
    expect(instrumentationSource).toContain("await nodeRegistration");
    expect(instrumentationSource).toContain('if (process.env.NEXT_RUNTIME === "edge")');
    expect(instrumentationSource).not.toContain("@/lib/observability/logger");
    expect(instrumentationSource).not.toContain("@/lib/observability/request-id");
    expect(nodeInstrumentationSource).toContain('from "@/lib/observability/logger"');
    expect(nodeInstrumentationSource).toContain('from "@/lib/observability/request-id"');
    expect(redactionSource).toContain('from "node:crypto"');
  });
});
