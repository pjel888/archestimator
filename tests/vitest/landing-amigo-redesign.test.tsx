import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { HeroSection, heroCopyVariants } from "@/components/landing/HeroSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PricingSection } from "@/components/landing/PricingSection";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { SecondaryClaimSection } from "@/components/landing/SecondaryClaimSection";
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
    expect(page.indexOf("<CompanyProofCarouselSection />")).toBeGreaterThan(
      page.indexOf("<ProblemSection />"),
    );
    expect(page.indexOf("<SecondaryClaimSection />")).toBeGreaterThan(
      page.indexOf("<CompanyProofCarouselSection />"),
    );
    expect(page.indexOf("<ProductShowcaseSection />")).toBeGreaterThan(
      page.indexOf("<SecondaryClaimSection />"),
    );
    expect(page.indexOf("<PricingSection />")).toBeGreaterThan(
      page.indexOf("<ProductShowcaseSection />"),
    );
    expect(page.indexOf("<FinalCTASection")).toBeGreaterThan(
      page.indexOf("<PricingSection />"),
    );
  });

  it("renders a compact header without the removed announcement strip", async () => {
    const user = userEvent.setup();

    render(<LandingHeader isLoggedIn={false} isHomePage />);

    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /The estimate platform approach/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a walkthrough" })).toHaveAttribute(
      "href",
      "/contact",
    );
    const menuButton = screen.getByRole("button", { name: "Menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    for (const label of ["Platform", "Specialties", "Workflow", "Insights", "Company"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("uses an Archestimator hero with the frosted construction visual rail", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "The proposal workspace for construction estimates.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Keep scope, rates, assumptions, and closed-beta revisions connected/i)).toBeInTheDocument();
    expect(heroCopyVariants.map((variant) => variant.headline)).toEqual(
      expect.arrayContaining([
        "The proposal workspace for construction estimates.",
        "A calmer platform for estimate handoff.",
      ]),
    );

    const visual = screen.getByTestId("landing-hero-frosted-visual");
    expect(visual).toHaveAttribute("data-visual-reference", "amigo-right-rail");
    expect(screen.getByTestId("landing-hero-copy-block").className).toContain(
      "lg:h-[603px]",
    );
    expect(visual.className).toContain("lg:h-[603px]");
    expect(screen.queryByText("Scope logic")).not.toBeInTheDocument();
    expect(screen.queryByText("Reusable catalog")).not.toBeInTheDocument();
    expect(screen.queryByText("Revision trail")).not.toBeInTheDocument();
    expect(within(visual).getByText("Closed beta workspace preview")).toBeInTheDocument();
    expect(within(visual).getAllByText("Build").length).toBeGreaterThan(0);
    expect(within(visual).getAllByText("Estimate").length).toBeGreaterThan(0);
    expect(within(visual).getAllByText("Propose").length).toBeGreaterThan(0);
    expect(within(visual).getAllByText("Scope map").length).toBeGreaterThan(0);
    expect(within(visual).getAllByText("Rate logic").length).toBeGreaterThan(0);
    expect(within(visual).getAllByText("Handoff").length).toBeGreaterThan(0);
    const slides = within(visual).getAllByTestId("landing-hero-slide");
    expect(slides).toHaveLength(9);
    expect(decodeURIComponent(slides[0].getAttribute("src") ?? "")).toContain(
      "hero-slides/construction-slide-01.jpg",
    );
    expect(decodeURIComponent(slides.at(-1)?.getAttribute("src") ?? "")).toContain(
      "hero-slides/construction-slide-09.jpg",
    );
    expect(within(visual).getByTestId("neat-wireframe-background")).toBeInTheDocument();
  });

  it("maps the reference section rhythm onto original Archestimator sections", () => {
    render(
      <>
        <SecondaryClaimSection />
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
    expect(screen.getAllByText("General contractors").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Specialty trades").length).toBeGreaterThan(0);
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
