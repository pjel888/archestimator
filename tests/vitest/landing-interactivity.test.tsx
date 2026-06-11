import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HeroSection, heroCopyVariants } from "@/components/landing/HeroSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { SolutionSection } from "@/components/landing/SolutionSection";

vi.mock("@/components/landing/NeatWireframeBackground", () => ({
  NeatWireframeBackground: () => <div data-testid="neat-wireframe-background" />,
}));

describe("landing page below-hero interactivity", () => {
  it("keeps closed-beta hero A/B copy grounded in product workflow", () => {
    render(<HeroSection />);

    expect(screen.getByRole("heading", { name: /proposal workspace for construction estimates/i })).toBeInTheDocument();
    expect(heroCopyVariants.map((variant) => variant.headline)).toEqual(
      expect.arrayContaining([
        "The proposal workspace for construction estimates.",
        "A calmer platform for estimate handoff.",
      ]),
    );
    expect(heroCopyVariants.map((variant) => variant.support).join(" ")).toMatch(
      /closed-beta/i,
    );
    expect(heroCopyVariants.map((variant) => variant.headline).join(" ")).not.toMatch(
      /smart ones|competitors are already/i,
    );
    expect(screen.queryByRole("heading", { name: /competitors are already/i })).not.toBeInTheDocument();
  });

  it("switches product preview content through accessible product tabs", async () => {
    const user = userEvent.setup();

    render(<ProductShowcaseSection />);

    const estimateWorkspaceTab = screen.getByRole("tab", { name: "Estimate Workspace" });
    const componentLibraryTab = screen.getByRole("tab", { name: "Component Library" });
    const revisionIntelligenceTab = screen.getByRole("tab", { name: "Revision Intelligence" });

    expect(estimateWorkspaceTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Estimate Workspace" })).toBeInTheDocument();

    await user.click(componentLibraryTab);

    expect(componentLibraryTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Component Library" })).toBeInTheDocument();
    expect(screen.getByText(/reuse repeated assemblies/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /insert/i })).not.toBeInTheDocument();

    await user.click(revisionIntelligenceTab);

    expect(revisionIntelligenceTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Revision Intelligence" })).toHaveTextContent(/planned preview/i);
    expect(screen.getByText(/in the planned workflow/i)).toBeInTheDocument();
  });

  it("supports arrow-key movement across the product tabs", async () => {
    const user = userEvent.setup();

    render(<ProductShowcaseSection />);

    const estimateWorkspaceTab = screen.getByRole("tab", { name: "Estimate Workspace" });
    estimateWorkspaceTab.focus();

    await user.keyboard("{ArrowRight}");

    const componentLibraryTab = screen.getByRole("tab", { name: "Component Library" });
    expect(componentLibraryTab).toHaveFocus();
    expect(componentLibraryTab).toHaveAttribute("aria-selected", "true");
  });

  it("replaces the public solution placeholder with a credible quote workflow visual", () => {
    render(<SolutionSection />);

    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
    expect(screen.getByText(/connected quote workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/line-item structure drives connected quote logic/i)).toBeInTheDocument();
  });

  it("renders a professional footer with grounded quote-and-proposal navigation", () => {
    render(<LandingFooter />);

    const footer = screen.getByRole("contentinfo", { name: /estimate infrastructure/i });
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute("data-visual-reference", "amigo-footer");
    expect(footer).toHaveStyle({ backgroundColor: "#aa412a" });
    expect(screen.getByText(/Estimate infrastructure for building and handing off construction proposals/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/workshop");
    expect(screen.getByRole("link", { name: "Platform" })).toHaveAttribute("href", "#product");
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Archestimator`))).toBeInTheDocument();
    expect(footer).not.toHaveTextContent(/Trusted by|Used by|Customers include|testimonial|MVP preview|Less file hunting/i);
  });
});
