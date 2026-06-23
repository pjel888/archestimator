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

  it("keeps the active homepage on the deployed landing shell, not generated variants", () => {
    const page = readProjectFile("src/app/page.tsx");
    const hero = readProjectFile("src/components/landing/HeroSection.tsx");

    expect(page).toMatch(/LandingHeader|LandingFooter|HeroSection/);
    expect(page).not.toContain("@/components/frontdoor");
    expect(page).not.toMatch(new RegExp("Redesigned" + "LandingPage"));
    expect(page).not.toMatch(new RegExp("gpt" + "-taste"));
    expect(hero).toMatch(/Close Projects Faster\./);
    expect(hero).toMatch(/The fastest path from proposal to approval\./);
    expect(`${page}\n${hero}`).not.toMatch(/Product proof|cost intelligence layer/i);
    expect(`${page}\n${hero}`).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
  });
});
