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

describe("GPT Taste landing reset", () => {
  it("routes the active homepage to the new reset instead of the rejected section stack", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page).toContain("RedesignedLandingPage");
    expect(page).not.toContain("LandingSmoothScrollProvider");
    expect(page).not.toContain("HeroSection");
    expect(page).not.toContain("ProblemSection");
    expect(page).not.toContain("ClaimsLedgerSection");
    expect(page).not.toContain("FinalCtaSection");
  });

  it("renders a full-width two-CTA hero without launch-stage language", () => {
    render(<RedesignedLandingPage isLoggedIn={false} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Estimates that remember every job.",
    );
    expect(screen.getAllByRole("link", { name: "Start free" }).length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: "Book a walkthrough" })).toHaveAttribute(
      "href",
      "/contact?intent=walkthrough",
    );

    const root = screen.getByRole("main");
    expect(root).toHaveClass("overflow-x-hidden");
    expect(root).not.toHaveTextContent(/pre-launch|closed beta|MVP|roadmap|early access/i);
    expect(root).not.toHaveTextContent(/Trusted by|Used by|Customers include|testimonial/i);
  });

  it("locks the asymmetric hero, gapless bento math, and workshop material system", () => {
    const source = readProjectFile("src/components/landing/gpt-taste/RedesignedLandingPage.tsx");

    expect(source).toContain("max-w-6xl");
    expect(source).toContain("text-[clamp(2.75rem,5.35vw,6.15rem)]");
    expect(source).toContain("lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]");
    expect(source).toContain("gsap-hero-visual");
    expect(source).toContain("workshop-dashboard-bloom");
    expect(source).toContain("dashboard-grid-pattern");
    expect(source).toContain("grid-flow-dense");
    expect(source).toContain("lg:col-span-7");
    expect(source).toContain("lg:col-span-5");
    expect(source.match(/lg:col-span-4/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain("https://picsum.photos");
    expect(source).toContain("landing-gpt-marquee");
    expect(source).toContain("gsap-stack-card");
  });

  it("keeps the active public copy free of cheap labels and fake proof claims", () => {
    const source = readProjectFile("src/components/landing/gpt-taste/RedesignedLandingPage.tsx");

    expect(source).not.toMatch(/SECTION\s*\d|QUESTION\s*\d|ABOUT US/i);
    expect(source).not.toMatch(/pre-launch|closed beta|MVP|roadmap|early access/i);
    expect(source).not.toMatch(/Trusted by|Used by|Customers include|testimonial|adoption metrics/i);
    expect(source).not.toMatch(/\$199|\$299|\$599/);
  });
});
