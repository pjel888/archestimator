import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RedesignedLandingPage } from "@/components/landing/gpt-taste/RedesignedLandingPage";

vi.mock("@/components/landing/gpt-taste/LandingGsapMotion", () => ({
  LandingGsapMotion: () => <div data-testid="landing-gsap-motion" />,
}));

vi.mock("@/components/landing/gpt-taste/HeroSignalField", () => ({
  HeroSignalField: () => <div data-testid="hero-signal-field" />,
}));

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("landing page motion and interaction contract", () => {
  it("renders launched-feeling navigation, action links, and footer links", () => {
    render(<RedesignedLandingPage isLoggedIn={false} />);

    expect(screen.getByRole("link", { name: "Archestimator home" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Start free" })[0]).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    for (const label of ["Features", "Pricing", "Trust", "Contact"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
  });

  it("uses a horizontal accordion and hover physics for audience slices", () => {
    const source = readProjectFile("src/components/landing/gpt-taste/RedesignedLandingPage.tsx");

    expect(source).toContain("hover:flex-[1.55]");
    expect(source).toContain("transition-[flex]");
    expect(source).toContain("group-hover:scale-105");
    expect(source).toContain("gsap-role-card");
    expect(source).not.toContain("picsum.photos");
  });

  it("registers real GSAP ScrollTrigger behavior with reduced-motion fallback", () => {
    const motion = readProjectFile("src/components/landing/gpt-taste/LandingGsapMotion.tsx");

    expect(motion).toContain('import gsap from "gsap"');
    expect(motion).toContain('from "@gsap/react"');
    expect(motion).toContain('from "gsap/ScrollTrigger"');
    expect(motion).toContain("gsap.registerPlugin(useGSAP, ScrollTrigger)");
    expect(motion).toContain("(prefers-reduced-motion: reduce)");
    expect(motion).toContain("pin: pinTitle");
    expect(motion).toContain("scrub: true");
    expect(motion).toContain("gsap-stack-card");
    expect(motion).toContain("gsap-image-scale");
    expect(motion).toContain("gsap-hero-visual");
  });

  it("keeps the Three.js hero field client-only and low-risk for unsupported devices", () => {
    const field = readProjectFile("src/components/landing/gpt-taste/HeroSignalField.tsx");

    expect(field).toContain('"use client"');
    expect(field).toContain('from "three"');
    expect(field).toContain("(max-width: 1023px)");
    expect(field).toContain("(prefers-reduced-motion: reduce)");
    expect(field).toContain("requestAnimationFrame");
    expect(field).toContain("0xf24405");
    expect(field).toContain("0xffb27c");
    expect(field).toContain("pointermove");
    expect(field).toContain("renderer.dispose()");
  });
});
