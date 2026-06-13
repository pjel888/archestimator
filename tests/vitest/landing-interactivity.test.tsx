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

    expect(screen.getByRole("heading", { name: /fastest path from proposal to approval/i })).toBeInTheDocument();
    expect(heroCopyVariants.map((variant) => variant.headline)).toEqual(
      expect.arrayContaining([
        "The fastest path from proposal to approval.",
        "Estimate with Precision. Win with Clarity.",
      ]),
    );
    expect(heroCopyVariants.map((variant) => variant.evidenceGate).join(" ")).toMatch(
      /closed beta/i,
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

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute("data-visual-reference", "amigo-footer");
    expect(footer).toHaveStyle({ backgroundColor: "rgb(8, 50, 65)" });
    expect(screen.getByRole("link", { name: "Archestimator home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("link", { name: "Workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Platform" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Contact us" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Privacy policy" })).not.toBeInTheDocument();
    expect(footer).not.toHaveTextContent(new RegExp(`© ${new Date().getFullYear()} Archestimator`));
    expect(footer).not.toHaveTextContent(/Trusted by|Used by|Customers include|testimonial|MVP preview|Less file hunting/i);
  });
});
