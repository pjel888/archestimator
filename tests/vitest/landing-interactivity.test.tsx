import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HeroSection, heroCopyVariants } from "@/components/landing/HeroSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { SolutionSection } from "@/components/landing/SolutionSection";

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
    expect(
      heroCopyVariants.every(
        (variant) => variant.eyebrow === "Estimating & proposal workspace for construction teams",
      ),
    ).toBe(true);
    expect(heroCopyVariants.map((variant) => variant.headline).join(" ")).not.toMatch(
      /smart ones|competitors are already/i,
    );
    expect(screen.queryByRole("heading", { name: /competitors are already/i })).not.toBeInTheDocument();
  });

  it("proves the product with the estimate artifact instead of the slide rotation", () => {
    render(<HeroSection />);

    const artifacts = screen.getAllByTestId("landing-hero-estimate-artifact");
    expect(artifacts).toHaveLength(2); // compact (mobile) + full (desktop)
    expect(screen.getAllByText("Estimate — Kitchen fit-out — Rev B")).toHaveLength(2);
    expect(screen.getAllByText("Now on closed beta")).toHaveLength(2);
    expect(screen.getAllByText("Kitchen subtotal").length).toBeGreaterThan(0);
    expect(screen.getByText("₱402,920")).toBeInTheDocument();
    expect(screen.getAllByText("Proposal preview")).toHaveLength(2);
    // Library card renders on the full artifact only (hidden in compact)
    expect(screen.getByText("From your library — drag into Kitchen")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Request beta access" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#method");

    expect(screen.queryAllByTestId("landing-hero-slide")).toHaveLength(0);
    expect(screen.queryByTestId("landing-hero-frosted-visual")).not.toBeInTheDocument();
    expect(screen.queryByTestId("neat-wireframe-background")).not.toBeInTheDocument();
  });

  it("switches product preview content through accessible product tabs", async () => {
    const user = userEvent.setup();

    render(<ProductShowcaseSection />);

    const estimateWorkspaceTab = screen.getByRole("tab", { name: "Estimate workspace" });
    const componentLibraryTab = screen.getByRole("tab", { name: "Component library" });
    const revisionIntelligenceTab = screen.getByRole("tab", { name: "Revision intelligence" });

    expect(estimateWorkspaceTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Estimate workspace" })).toBeInTheDocument();

    await user.click(componentLibraryTab);

    expect(componentLibraryTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Component library" })).toBeInTheDocument();
    expect(screen.getByText(/reuse repeated assemblies/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /insert/i })).not.toBeInTheDocument();

    await user.click(revisionIntelligenceTab);

    expect(revisionIntelligenceTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Revision intelligence" })).toHaveTextContent(/planned preview/i);
    expect(screen.getByText(/in the planned workflow/i)).toBeInTheDocument();
  });

  it("supports arrow-key movement across the product tabs", async () => {
    const user = userEvent.setup();

    render(<ProductShowcaseSection />);

    const estimateWorkspaceTab = screen.getByRole("tab", { name: "Estimate workspace" });
    estimateWorkspaceTab.focus();

    await user.keyboard("{ArrowRight}");

    const componentLibraryTab = screen.getByRole("tab", { name: "Component library" });
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
    expect(footer.style.backgroundColor).toBe("var(--brand-petrol-deep)");
    expect(screen.getByText(/Estimate infrastructure for building and handing off construction proposals/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/workshop");
    expect(screen.getByRole("link", { name: "Platform" })).toHaveAttribute("href", "#product");
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Archestimator`))).toBeInTheDocument();
    expect(footer).not.toHaveTextContent(/Trusted by|Used by|Customers include|testimonial|MVP preview|Less file hunting/i);
  });
});
