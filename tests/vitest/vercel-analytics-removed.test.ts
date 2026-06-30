import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");

function dependencyNames() {
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);
}

describe("Vercel analytics removal", () => {
  it("does not ship Vercel Analytics or Speed Insights packages in the Cloudflare runtime", () => {
    const names = dependencyNames();

    expect(names.has("@vercel/analytics")).toBe(false);
    expect(names.has("@vercel/speed-insights")).toBe(false);
  });

  it("does not mount Vercel client telemetry globally", () => {
    expect(rootLayout).not.toContain("@vercel/analytics");
    expect(rootLayout).not.toContain("@vercel/speed-insights");
    expect(rootLayout).not.toContain("VercelWebAnalytics");
    expect(rootLayout).not.toContain("SpeedInsights");
    expect(rootLayout).not.toContain("NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS_IN_DEV");
  });

  it("removes the retired Vercel analytics adapter files", () => {
    expect(existsSync("src/components/analytics/VercelWebAnalytics.tsx")).toBe(false);
    expect(existsSync("src/lib/analytics/vercel-web-analytics.ts")).toBe(false);
  });
});
