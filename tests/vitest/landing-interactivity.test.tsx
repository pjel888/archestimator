import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const deletedGeneratedFolder = "src/components/landing/aec" + "-cost-intelligence";
const deletedHomeFolder = "src/components/home";

describe("deleted landing page implementation", () => {
  it("removes generated and superseded home implementation directories", () => {
    expect(existsSync(join(process.cwd(), deletedGeneratedFolder))).toBe(false);
    expect(existsSync(join(process.cwd(), deletedHomeFolder))).toBe(false);
  });

  it("keeps the active homepage on landing-v3, not generated variants or frontdoor", () => {
    const page = readProjectFile("src/app/page.tsx");
    const landingV3 = readProjectFile("src/components/landing-v3/ArchestimatorLandingPage.tsx");

    expect(page).toContain("@/components/landing-v3/ArchestimatorLandingPage");
    expect(page).not.toContain("@/components/frontdoor");
    expect(page).not.toMatch(new RegExp("Redesigned" + "LandingPage"));
    expect(page).not.toMatch(new RegExp("gpt" + "-taste"));
    expect(landingV3).toMatch(/The estimate that keeps working after you send it\./);
    expect(landingV3).toMatch(/archestimator is the premier tool for winning bids\./i);
    expect(landingV3).toMatch(/one workflow from cost estimating to client approval\./i);
    expect(`${page}\n${landingV3}`).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
    expect(`${page}\n${landingV3}`).not.toMatch(/Start Winning|Close Projects Faster/i);
  });
});
