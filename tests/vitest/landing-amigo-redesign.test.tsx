import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { HeroSection, heroCopyVariants } from "@/components/landing/HeroSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SecondaryClaimSection } from "@/components/landing/SecondaryClaimSection";

vi.mock("@/components/landing/NeatWireframeBackground", () => ({
  NeatWireframeBackground: () => <div data-testid="neat-wireframe-background" />,
}));

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("Amigo-inspired public landing redesign", () => {
  it("orders the home page around the simplified launch flow", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page.indexOf("<HeroSection")).toBeGreaterThan(-1);
    expect(page.indexOf("<CompanyProofCarouselSection />")).toBeGreaterThan(
      page.indexOf("<HeroSection"),
    );
    expect(page.indexOf("<SecondaryClaimSection />")).toBeGreaterThan(
      page.indexOf("<CompanyProofCarouselSection />"),
    );
    expect(page.indexOf("<FinalCTASection />")).toBeGreaterThan(
      page.indexOf("<SecondaryClaimSection />"),
    );
    expect(page.indexOf("<LandingFooter />")).toBeGreaterThan(
      page.indexOf("<FinalCTASection />"),
    );
    expect(page).not.toContain("<ProductShowcaseSection />");
    expect(page).not.toContain("<SolutionSection />");
    expect(page).not.toContain("<PricingSection />");
    expect(page).not.toContain("<FAQSection />");
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

    for (const label of ["Platform", "Specialties", "Company"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Workflow" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Insights" })).not.toBeInTheDocument();
  });

  it("uses an Archestimator hero with the frosted construction visual rail", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "The fastest path from proposal to approval.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/single, centralized workflow to build pricing/i)).toBeInTheDocument();
    expect(heroCopyVariants.map((variant) => variant.headline)).toEqual(
      expect.arrayContaining([
        "The fastest path from proposal to approval.",
        "Estimate with Precision. Win with Clarity.",
      ]),
    );
    expect(heroCopyVariants.map((variant) => variant.evidenceGate)).toEqual([
      "Closed beta preview",
      "Closed beta preview",
    ]);

    const visual = screen.getByTestId("landing-hero-frosted-visual");
    expect(visual).toHaveAttribute("data-visual-reference", "amigo-right-rail");
    expect(screen.getByTestId("landing-hero-copy-block").className).toContain(
      "lg:h-[603px]",
    );
    expect(visual.className).toContain("lg:h-[603px]");
    expect(screen.queryByText("Scope logic")).not.toBeInTheDocument();
    expect(screen.queryByText("Reusable catalog")).not.toBeInTheDocument();
    expect(screen.queryByText("Revision trail")).not.toBeInTheDocument();
    for (const label of ["Work Smarter", "Propose Better", "Win Faster"]) {
      expect(within(visual).getByText(label)).toBeInTheDocument();
    }
    for (const signal of [
      "Project-Shaped Workflow",
      "Reusable Component Library",
      "Intuitive Estimating Experience",
      "Proposal Handoff",
      "Activity History",
    ]) {
      expect(within(visual).getByText(signal)).toBeInTheDocument();
    }
    const slides = within(visual).getAllByTestId("landing-hero-slide");
    expect(slides).toHaveLength(9);
    expect(decodeURIComponent(slides[0].getAttribute("src") ?? "")).toContain(
      "hero-slides/construction-slide-01.jpg",
    );
    expect(decodeURIComponent(slides.at(-1)?.getAttribute("src") ?? "")).toContain(
      "hero-slides/construction-slide-09.jpg",
    );
    expect(within(visual).getAllByTestId("neat-wireframe-background").length).toBeGreaterThan(0);
  });

  it("maps the reference section rhythm onto the retained launch sections", () => {
    const companyProof = readProjectFile(
      "src/components/landing/CompanyProofCarouselSection.tsx",
    );
    const launchHeading = readProjectFile(
      "src/components/landing/LaunchFeatureHeading.tsx",
    );

    render(
      <>
        <SecondaryClaimSection />
        <FinalCTASection />
      </>,
    );

    expect(companyProof).toContain("AnimatedProposalRecordSection");
    expect(companyProof).toContain("Launch feature video");
    expect(companyProof).toContain("Project-Shaped Workflow");
    expect(launchHeading).toContain("See the complete");
    expect(launchHeading).toContain("archestimator");
    expect(launchHeading).toContain("workflow");
    expect(
      screen.getByRole("heading", { name: "Workflows designed for every estimating specialty." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Reliable estimating infrastructure for construction proposals.",
      }),
    ).toBeInTheDocument();
  });
});
