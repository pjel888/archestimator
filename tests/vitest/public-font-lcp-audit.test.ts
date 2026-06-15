import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const performancePlanDir = existsSync(".ai/03_plans/2026-06-05-performance-and-speed")
  ? ".ai/03_plans/2026-06-05-performance-and-speed"
  : ".ai/09_archive/2026-06-05-performance-and-speed";
const globals = readFileSync("src/app/globals.css", "utf8");
const evidenceSummary = readFileSync(
  `${performancePlanDir}/evidence/public-lighthouse-2026-06-06/public-lighthouse-mobile-summary.json`,
  "utf8",
);

describe("public image/font LCP audit", () => {
  it("keeps only the measured mono font variable in the root layout", () => {
    expect(rootLayout).toContain("Roboto_Mono");
    expect(rootLayout).toContain("--font-roboto-mono");
    expect(rootLayout).not.toContain("Inter");
    expect(rootLayout).not.toContain("Poppins");
    expect(rootLayout).not.toContain("Source_Serif_4");
    expect(rootLayout).not.toContain("--font-inter");
    expect(rootLayout).not.toContain("--font-poppins");
    expect(rootLayout).not.toContain("--font-source-serif");
    expect(globals).not.toContain("--font-poppins: var(--font-poppins)");
    expect(globals).not.toContain("--font-serif: var(--font-source-serif)");
  });

  it("keeps public LCP evidence image-free before adding image preloads", () => {
    const summary = JSON.parse(evidenceSummary) as { rows: Array<{ file: string; lcpMs: number }> };

    expect(summary.rows.some((row) => row.file.includes("home-mobile"))).toBe(true);
    expect(rootLayout).not.toContain("preload={true}");
    expect(globals).toContain('font-family: var(--font-sf-pro)');
    expect(globals).toContain('"SF Pro Text", "SF Pro Display", -apple-system');
  });
});
