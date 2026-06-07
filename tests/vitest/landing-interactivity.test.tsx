import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HeroSection, heroCopyVariants } from "@/components/landing/HeroSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { SecondaryClaimSection } from "@/components/landing/SecondaryClaimSection";

vi.mock("@/components/landing/NeatWireframeBackground", () => ({
  NeatWireframeBackground: () => <div data-testid="neat-wireframe-background" />,
}));

describe("landing page below-hero interactivity", () => {
  it("keeps hero A/B copy grounded in product workflow", () => {
    render(<HeroSection />);

    expect(screen.getByRole("heading", { name: /quote logic your buyer can trust/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request access/i })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: /view product direction/i })).toHaveAttribute("href", "/features");
    expect(heroCopyVariants.map((variant) => variant.headline)).toEqual(
      expect.arrayContaining([
        "Quote logic your buyer can trust.",
        "From estimate to proposal, keep the math attached.",
      ]),
    );
    expect(heroCopyVariants.map((variant) => variant.support).join(" ")).not.toMatch(
      /beta|closed-beta/i,
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

  it("renders a focused method section with compact walkthrough slots", () => {
    render(<SecondaryClaimSection />);

    expect(screen.getByRole("heading", { name: /estimate\. revise\. propose\./i })).toBeInTheDocument();
    expect(screen.getByText("Workflow walkthroughs")).toBeInTheDocument();
    expect(screen.getByText("Quote build")).toBeInTheDocument();
    expect(screen.getByText("Revision review")).toBeInTheDocument();
    expect(screen.getAllByText("Proposal handoff").length).toBe(1);
    expect(screen.getAllByRole("button", { name: /video placeholder/i })).toHaveLength(3);
    expect(screen.getByText("Quantities, rates, suppliers.")).toBeInTheDocument();
    expect(screen.getByText("Changes, assumptions, approvals.")).toBeInTheDocument();
    expect(screen.getByText("Inclusions, exclusions, totals.")).toBeInTheDocument();
    expect(screen.queryByText(/Video slot|Planned video/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Not claimed")).not.toBeInTheDocument();
    expect(screen.queryByText(/recording slot|no faux app screenshots/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Trusted by|Used by|Customers include/i)).not.toBeInTheDocument();
  });

  it("renders a professional footer with grounded quote-and-proposal navigation", () => {
    render(<LandingFooter />);

    const footer = screen.getByRole("contentinfo", { name: /estimate\. revise\. propose\./i });
    expect(footer).toBeInTheDocument();
    expect(screen.getAllByText(/Estimate\. Revise\. Propose\./i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Request access/i }).map((link) => link.getAttribute("href"))).toContain("/contact");
    expect(screen.queryByRole("link", { name: /Try Workspace/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Feature status" })).toHaveAttribute("href", "/features");
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Archestimator`))).toBeInTheDocument();
    expect(footer).not.toHaveTextContent(/Trusted by|Used by|Customers include|testimonial/i);
  });

  it("renders authenticated footer access as Open workspace", () => {
    render(<LandingFooter isLoggedIn={true} />);

    expect(screen.getAllByRole("link", { name: /Open workspace/i }).map((link) => link.getAttribute("href"))).toContain("/workshop");
    expect(screen.queryByRole("link", { name: /Request access/i })).not.toBeInTheDocument();
  });
});
