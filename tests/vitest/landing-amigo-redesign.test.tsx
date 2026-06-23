import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(() => "vitest"),
  })),
}));

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const deletedGeneratedComponent = "AecCost" + "IntelligenceLandingPage";
const deletedResetComponent = "Redesigned" + "LandingPage";
const deletedNamespace = "gpt" + "-taste";

const readActiveHomepageSource = () =>
  [
    readProjectFile("src/app/page.tsx"),
    readProjectFile("src/components/landing/HeroSection.tsx"),
    readProjectFile("src/components/landing/CompanyProofCarouselSection.tsx"),
    readProjectFile("src/components/landing/SecondaryClaimSection.tsx"),
    readProjectFile("src/components/landing/FinalCTASection.tsx"),
  ].join("\n");

describe("deployed landing homepage contract", () => {
  it("renders the deployed proposal-to-approval homepage with workflow content", async () => {
    render(await LandingPage());

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("data-landing-page-root", "true");
    expect(main).not.toHaveAttribute("data-frontdoor-root");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /The fastest path from proposal to approval\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Close Projects Faster.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Winning" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("heading", { name: "One Workflow" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /See the complete.*workflow/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Workflows designed for every estimating specialty." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reliable estimating infrastructure for construction proposals." })).toBeInTheDocument();
  });

  it("keeps the active homepage routed to the deployed landing namespace", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page).toContain("@/components/landing");
    expect(page).not.toContain("@/components/frontdoor");
    expect(page).not.toContain("@/components/home");
    expect(page).not.toContain(deletedGeneratedComponent);
    expect(page).not.toContain(deletedResetComponent);
    expect(page).not.toContain(deletedNamespace);
  });

  it("keeps the active public copy on deployed proposal workflow positioning", () => {
    const activeCopy = readActiveHomepageSource();

    expect(activeCopy).not.toMatch(/early access/i);
    expect(activeCopy).not.toMatch(/Pre-launch MVP preview/i);
    expect(activeCopy).not.toMatch(new RegExp("for " + "contractors", "i"));
    expect(activeCopy).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
    expect(activeCopy).toMatch(/Close Projects Faster\./);
    expect(activeCopy).toMatch(/The fastest path from proposal to approval\./);
    expect(activeCopy).toMatch(/Project-Shaped Workflow/);
    expect(activeCopy).toMatch(/Reusable Component Library/);
  });

  it("keeps deployed product walkthrough placeholders intentional and scoped", () => {
    const activeCopy = readActiveHomepageSource();

    expect(activeCopy).toMatch(/Product walkthrough placeholder/i);
    expect(activeCopy).toMatch(/data-launch-feature-video-placeholder/);
    expect(activeCopy).toMatch(/data-youtube-video-placeholder/);
    expect(activeCopy).not.toMatch(/Trusted by|Used by|Customers include/i);
    expect(activeCopy).not.toMatch(/10x|AI-powered|all-in-one platform/i);
  });
});
