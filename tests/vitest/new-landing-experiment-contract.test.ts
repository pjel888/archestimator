import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  approvedOneLiner as implementedOneLiner,
  coreBodyCopy,
  newLandingCopy,
} from "../../src/app/new/_content";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const routePath = path.join(projectRoot, "src/app/new/page.tsx");
const contentPath = path.join(projectRoot, "src/app/new/_content.ts");
const componentPath = path.join(
  projectRoot,
  "src/app/new/_components/new-landing-page.tsx",
);
const stylesPath = path.join(
  projectRoot,
  "src/app/new/new-landing.module.css",
);

const approvedOneLiner =
  "Archestimator helps businesses in the AEC industry to build structured cost estimates and turn them into client-ready proposals that can be reviewed, discussed, and decided in one connected workflow.";

describe("new landing experiment contract", () => {
  it("owns an isolated experimental composition", () => {
    expect(existsSync(contentPath)).toBe(true);
    expect(existsSync(componentPath)).toBe(true);
    expect(existsSync(stylesPath)).toBe(true);
  });

  it("keeps independent search-safe route metadata", () => {
    const routeSource = readFileSync(routePath, "utf8");

    expect(routeSource).toMatch(
      /title:\s*\{\r?\n\s*absolute: "Build, Publish, Decide \| Archestimator"/u,
    );
    expect(routeSource).toContain("index: false");
    expect(routeSource).toContain("follow: false");
    expect(routeSource).not.toContain("canonical");
    expect(routeSource).not.toContain("KimiLandingPage");
  });

  it("preserves the shared ripple image while owning the hero and body", () => {
    if (!existsSync(contentPath) || !existsSync(componentPath)) return;

    const contentSource = readFileSync(contentPath, "utf8");
    const componentSource = readFileSync(componentPath, "utf8");
    const experimentSource = `${contentSource}\n${componentSource}`;

    expect(componentSource).toContain("KimiSiteHeader");
    expect(componentSource).toContain("HeroVoxelRippleImage");
    expect(componentSource).toContain('<NewExperimentCta placement="hero" />');
    expect(componentSource).toContain("LandingMotionLoader");
    expect(componentSource).not.toContain("HeroAmbitionText");
    expect(componentSource).not.toContain("HeroAudienceRoles");
    expect(componentSource).not.toContain("heroCopy");
    expect(componentSource).not.toContain("KimiLandingPage");
    expect(componentSource).not.toContain("PrimaryCtaLink");
    expect(experimentSource.split(approvedOneLiner)).toHaveLength(2);
    expect(experimentSource).not.toContain("—");
  });

  it("keeps the approved narrative concise and within product boundaries", () => {
    const coreCopy = coreBodyCopy.join(" ");
    const wordCount = coreCopy.trim().split(/\s+/u).length;
    const sectionIntroductions = [
      newLandingCopy.circumstance.intro,
      newLandingCopy.workflow.intro,
      newLandingCopy.proof.intro,
      newLandingCopy.objections.intro,
    ];

    expect(implementedOneLiner).toBe(approvedOneLiner);
    expect(newLandingCopy.hero.headline).toEqual(["Build.", "Publish.", "Decide."]);
    expect(newLandingCopy.objections.items).toHaveLength(4);
    expect(newLandingCopy.objections.items.at(-1)?.copy).toContain(
      "available by request",
    );
    expect(newLandingCopy.objections.items.at(-1)?.copy).not.toContain("pre-release");
    expect(newLandingCopy.objections.items.at(-1)?.copy).not.toContain("closed beta");
    expect(wordCount).toBeGreaterThanOrEqual(450);
    expect(wordCount).toBeLessThanOrEqual(750);
    expect(
      sectionIntroductions.every(
        (introduction) => introduction.trim().split(/\s+/u).length <= 45,
      ),
    ).toBe(true);
    expect(coreCopy).not.toMatch(/\bsmall\b/iu);
    expect(coreCopy).not.toContain("—");
    expect(coreCopy).not.toMatch(
      /\b(?:RFQ intake|payments?|contracts?|purchase orders?|invoicing|legally binding|immutable issuance|AI-powered)\b/iu,
    );
  });
});
