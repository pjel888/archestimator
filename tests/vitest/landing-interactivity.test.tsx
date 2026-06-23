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

  it("keeps the active homepage free of prior landing vocabulary", () => {
    const page = readProjectFile("src/app/page.tsx");
    const frontdoor = readProjectFile("src/components/frontdoor/FrontdoorPage.tsx");

    expect(page).not.toMatch(/Product proof|cost intelligence layer/i);
    expect(frontdoor).not.toMatch(/ProductProof|data-proof-asset|data-landing-signal-field/i);
    expect(frontdoor).not.toMatch(/Trusted by|Used by|Customers include|testimonial/i);
    expect(`${page}\n${frontdoor}`).not.toMatch(new RegExp(["M", "VP"].join(""), "i"));
    expect(`${page}\n${frontdoor}`).not.toMatch(new RegExp(["pre", "launch"].join("-"), "i"));
    expect(`${page}\n${frontdoor}`).not.toMatch(new RegExp("closed-" + "beta", "i"));
    expect(`${page}\n${frontdoor}`).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
    expect(page).not.toMatch(/LandingCTAs|LandingHeader|LandingFooter|LandingShellClient/i);
  });
});
