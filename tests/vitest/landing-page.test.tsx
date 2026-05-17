import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/page";

describe("LandingPage", () => {
  it("renders Intercom-inspired hero heading and CTAs", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /Estimates that feel as focused as your best spreadsheet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start estimating/i })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: /Open workspace/i })).toHaveAttribute("href", "/projects");
  });

  it("renders product system feature cards", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /Estimate in the workspace, not a cramped card/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cost clarity from row to proposal/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Revision history with context/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Client-ready proposal snapshots/i })).toBeInTheDocument();
  });

  it("renders workflow steps", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /From project setup to client proposal/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Open the dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Estimate in context/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Issue with confidence/i })).toBeInTheDocument();
  });
});
