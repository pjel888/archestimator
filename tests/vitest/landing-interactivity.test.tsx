import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const deletedGeneratedFolder = "src/components/landing/aec" + "-cost-intelligence";
const deletedHomeFolder = "src/components/home";

describe("public landing implementation", () => {
  it("removes generated and superseded home implementation directories", () => {
    expect(existsSync(join(process.cwd(), deletedGeneratedFolder))).toBe(false);
    expect(existsSync(join(process.cwd(), deletedHomeFolder))).toBe(false);
  });

  it("keeps the active homepage on the Kimi composition, not superseded variants", () => {
    const page = readProjectFile("src/app/page.tsx");
    const landing = readProjectFile("src/app/kimi3d/_components/kimi-landing-page.tsx");
    const content = readProjectFile("src/app/kimi3d/_content.ts");

    expect(page).toContain('./kimi3d/_components/kimi-landing-page');
    expect(page).toContain("return <KimiLandingPage />");
    expect(page).not.toContain("@/components/frontdoor");
    expect(page).not.toContain("@/components/landing-v3");
    expect(page).not.toMatch(new RegExp("Redesigned" + "LandingPage"));
    expect(page).not.toMatch(new RegExp("gpt" + "-taste"));
    expect(landing).toContain("HeroVoxelRippleImage");
    expect(landing).toContain("HeroWorkspaceProof");
    expect(landing).toContain("LandingMotionLoader");
    expect(content).toContain('leadTitleStart: "From cost estimate to client approval."');
    expect(content).toContain('leadTitleHighlight: "All in one workflow."');
    expect(`${page}\n${landing}\n${content}`).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
    expect(`${page}\n${landing}\n${content}`).not.toMatch(/Start Winning|Close Projects Faster/i);
  });
});
