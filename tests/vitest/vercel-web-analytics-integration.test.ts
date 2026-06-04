import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");

describe("Vercel Web Analytics integration", () => {
  it("loads the supported Next.js Analytics component from the root app layout", () => {
    expect(packageJson.dependencies).toHaveProperty("@vercel/analytics");
    expect(rootLayout).toContain('import { Analytics } from "@vercel/analytics/next";');
    expect(rootLayout).toContain("<Analytics />");
  });

  it("keeps Speed Insights removed while enabling Web Analytics", () => {
    expect(packageJson.dependencies).not.toHaveProperty("@vercel/speed-insights");
    expect(rootLayout).not.toContain("SpeedInsights");
    expect(rootLayout).not.toContain("@vercel/speed-insights");
  });
});
