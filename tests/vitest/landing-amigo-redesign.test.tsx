import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CapabilityRowsSection } from "@/components/landing/CapabilityRowsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { SolutionSection } from "@/components/landing/SolutionSection";

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("Amigo-inspired public landing redesign", () => {
  it("orders the home page around the reference flow without moving product proof below the fold", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page.indexOf("<HeroSection")).toBeGreaterThan(-1);
    expect(page.indexOf("<AnimatedProposalRecordSection />")).toBeGreaterThan(
      page.indexOf("<HeroSection"),
    );
    expect(page.indexOf("<ProblemSection />")).toBeGreaterThan(
      page.indexOf("<AnimatedProposalRecordSection />"),
    );
    expect(page.indexOf("<CapabilityRowsSection />")).toBeGreaterThan(
      page.indexOf("<ProblemSection />"),
    );
    expect(page.indexOf("<ProductShowcaseSection />")).toBeGreaterThan(
      page.indexOf("<CapabilityRowsSection />"),
    );
    expect(page.indexOf("<PricingSection />")).toBeGreaterThan(
      page.indexOf("<ProductShowcaseSection />"),
    );
    expect(page.indexOf("<FinalCTASection")).toBeGreaterThan(
      page.indexOf("<PricingSection />"),
    );
  });

  it("maps the reference section rhythm onto original Archestimator sections", () => {
    render(
      <>
        <CapabilityRowsSection />
        <ProductShowcaseSection />
        <SolutionSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </>,
    );

    expect(
      screen.getByRole("heading", { name: "Workflows designed for every estimating specialty." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Structure your proposal the way you think about the work",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Build it once. Use it everywhere." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "From costing to client-ready in one flow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Archestimator estimate residency" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "A platform built for your estimate model" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "A partnership focused on quote-to-proposal value." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Get the latest field notes." })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Reliable estimating infrastructure for construction proposals.",
      }),
    ).toBeInTheDocument();
  });
});
