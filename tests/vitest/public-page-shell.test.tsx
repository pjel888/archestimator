import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicPageShell } from "@/components/landing/PublicPageShell";

describe("PublicPageShell Lenis scope", () => {
  it("renders non-home public content in a native main without the landing smooth-scroll provider", () => {
    render(
      <PublicPageShell isLoggedIn={false}>
        <section data-testid="non-home-content">Features content</section>
      </PublicPageShell>,
    );

    const content = screen.getByTestId("non-home-content");
    const main = content.closest("main");

    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute("data-landing-page-root", "true");
    expect(document.querySelector("[data-lenis-prevent]")).not.toBeInTheDocument();
  });
});
