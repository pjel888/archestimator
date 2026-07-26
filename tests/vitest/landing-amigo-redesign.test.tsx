import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync("src/app/page.tsx", "utf8");
const landingSource = readFileSync("src/app/kimi3d/_components/kimi-landing-page.tsx", "utf8");
const contentSource = readFileSync("src/app/kimi3d/_content.ts", "utf8");
const ctaSource = readFileSync("src/app/kimi3d/_components/cta-link.tsx", "utf8");
const landingCss = readFileSync("src/app/kimi3d/kimi-landing.module.css", "utf8");

describe("public Kimi landing contract", () => {
  it("keeps the public root routed directly to the current Kimi composition", () => {
    expect(pageSource).toContain('import { KimiLandingPage } from "./kimi3d/_components/kimi-landing-page"');
    expect(pageSource).toContain("return <KimiLandingPage />");
    expect(pageSource).toContain('export const dynamic = "force-static"');
    expect(pageSource).not.toContain("@/components/landing-v3");
  });

  it("keeps the primary claim tied to estimate, proposal, and client review workflow", () => {
    expect(contentSource).toContain('title: "BUILD WITH AMBITION"');
    expect(contentSource).toContain('leadTitleStart: "From cost estimate to client approval."');
    expect(contentSource).toContain('leadTitleHighlight: "All in one workflow."');
    expect(contentSource).toContain("Build detailed estimates, issue professional proposals, collect client feedback");
  });

  it("keeps public access claims honest for the current private alpha", () => {
    expect(contentSource).toContain('status: "Private alpha"');
    expect(contentSource).toContain('PRIMARY_CTA_LABEL = "Request early access"');
    expect(contentSource).toContain("Archestimator is currently in private alpha.");
    expect(contentSource).not.toMatch(/Trusted by|Used by|Customers include|10x|AI-powered/iu);
  });

  it("keeps the hero usable without motion or WebGL", () => {
    expect(landingSource).toContain('id="main"');
    expect(landingSource).toContain("HeroWorkspaceProof");
    expect(landingSource).toContain("LandingMotionLoader");
    expect(landingSource).toContain("narrative remains available without JavaScript, WebGL, or motion");
  });

  it("keeps one shared primary CTA implementation across the page", () => {
    expect(landingSource).toContain("PrimaryCtaLink");
    expect(ctaSource).toContain("export function PrimaryCtaLink");
    expect(ctaSource).toContain("className={cn(styles.ctaButton, className)}");
    expect(landingCss).toMatch(/\.root a\.ctaButton,[^{]*\{[^}]*inline-size: 12rem;/su);
    expect(landingCss).toMatch(/\.root a\.ctaButton,[^{]*\{[^}]*block-size: 3rem;/su);
    expect(landingCss).toMatch(/\.ctaArrow\s*\{[^}]*inline-size: 2rem;[^}]*block-size: 2rem;/su);
  });

  it("keeps the current variable display font scoped to the public composition", () => {
    expect(landingSource).toContain('import { Jersey_25 } from "next/font/google"');
    expect(landingSource).toContain('variable: "--font-jersey-25"');
    expect(landingSource).toContain("jersey25.variable");
  });
});
