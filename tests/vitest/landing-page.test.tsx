import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/page";

describe("LandingPage", () => {
  it("renders hero heading and CTAs", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /Precise construction estimating/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start estimating/i })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: /Open workspace/i })).toHaveAttribute("href", "/projects");
  });

  it("renders feature cards", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /Familiar estimate sheets/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Reusable cost library/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Version history/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Client-ready proposals/i })).toBeInTheDocument();
  });

  it("renders workflow steps", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /From takeoff to proposal/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Build your estimate/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Review & revise/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Issue proposals/i })).toBeInTheDocument();
  });
});
