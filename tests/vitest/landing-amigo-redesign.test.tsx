import { readFileSync } from "node:fs";
import { join } from "node:path";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";
import { ArchestimatorLandingPage } from "@/components/landing-v3/ArchestimatorLandingPage";

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
    readProjectFile("src/components/landing-v3/ArchestimatorLandingPage.tsx"),
    readProjectFile("src/components/landing-v3/ProductStage.tsx"),
    readProjectFile("src/components/landing-v3/landing-content.ts"),
  ].join("\n");

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
}

function renderWithQueryClient(ui: ReactElement) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

describe("landing-v3 homepage contract", () => {
  it("renders the living-estimate homepage with connected workflow content", async () => {
    const { container } = renderWithQueryClient(await LandingPage());

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("data-landing-page-root", "true");
    expect(main).not.toHaveAttribute("data-frontdoor-root");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Where estimates become client‑approved proposals\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/AEC construction cost estimating & proposal platform/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Archestimator walkthrough video preview")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Book a walkthrough/i })[0]).toHaveAttribute("href", "/contact?intent=walkthrough");
    expect(screen.getByRole("link", { name: "Explore the workflow" })).toHaveAttribute("href", "#workflow");
    expect(screen.getByRole("heading", { name: /From first cost to final decision/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Every completed estimate makes the next one stronger/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Flexible enough for the way your team scopes work/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Questions teams ask/i })).toBeInTheDocument();
    expect(screen.getByText(/Build estimates around real scope/i)).toBeInTheDocument();
    expect(screen.getByText("Structure that fits the job")).toBeInTheDocument();
    expect(screen.getByText("Components with memory")).toBeInTheDocument();
    expect(screen.getByText("Drag, drop, done")).toBeInTheDocument();
    expect(screen.getByText(/Turn the estimate into a client decision/i)).toBeInTheDocument();
    expect(screen.getByText("Branded client links")).toBeInTheDocument();
    expect(screen.getByText("Numbers that speak clearly")).toBeInTheDocument();
    expect(screen.getByText("Exports your trades already use")).toBeInTheDocument();
    expect(screen.getByText(/Record the decision and every change after/i)).toBeInTheDocument();
    expect(screen.getByText("Comment, accept, decline in one place")).toBeInTheDocument();
    expect(screen.getByText("Change orders without the paper trail")).toBeInTheDocument();
    expect(screen.getByText("Sign-off that holds up")).toBeInTheDocument();

    container.querySelectorAll<HTMLElement>("section[aria-labelledby]").forEach((section) => {
      const id = section.getAttribute("aria-labelledby");
      expect(id).toBeTruthy();
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    });
  });

  it("renders workspace CTAs without sign-in links for authenticated visitors", () => {
    renderWithQueryClient(<ArchestimatorLandingPage isLoggedIn={true} />);

    expect(screen.getAllByRole("link", { name: /Open workspace|Workspace/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^Sign in$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Book a walkthrough/i })).not.toBeInTheDocument();
  });

  it("keeps the active homepage routed to the landing-v3 namespace", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page).toContain("@/components/landing-v3/ArchestimatorLandingPage");
    expect(page).toContain("@/components/landing");
    expect(page).not.toContain("@/components/frontdoor");
    expect(page).not.toContain("@/components/home");
    expect(page).not.toContain(deletedGeneratedComponent);
    expect(page).not.toContain(deletedResetComponent);
    expect(page).not.toContain(deletedNamespace);
  });

  it("keeps navigation and hero CTAs on one typography scale", () => {
    const css = readProjectFile("src/components/landing-v3/landing-v3.module.css");

    expect(css).toMatch(/\.signInLink,\n\.primaryCta,\n\.secondaryCta\s*{[^}]*font-family: var\(--font-roboto-mono\)/);
    expect(css).toMatch(/\.signInLink,\n\.primaryCta,\n\.secondaryCta\s*{[^}]*font-size: 0\.75rem/);
    expect(css).toMatch(/\.signInLink,\n\.primaryCta,\n\.secondaryCta\s*{[^}]*font-weight: 650/);
  });

  it("keeps the active public copy on winning bids workflow positioning", () => {
    const activeCopy = readActiveHomepageSource();

    expect(activeCopy).not.toMatch(/early access/i);
    expect(activeCopy).not.toMatch(/Pre-launch MVP preview/i);
    expect(activeCopy).not.toMatch(new RegExp("for " + "contractors", "i"));
    expect(activeCopy).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
    expect(activeCopy).toMatch(/Where estimates become client‑approved proposals\./);
    expect(activeCopy).toMatch(/Stop losing time to spreadsheets and revisions\./);
    expect(activeCopy).toMatch(/archestimator turns estimating and proposals into one workflow so you spend less time working and more time winning\./);
    expect(activeCopy).toMatch(/Cost Estimators &middot; Architects &middot; Engineers &middot; Project Managers &middot; Construction Managers &middot; Construction Professionals/);
    expect(activeCopy).toMatch(/Reusable cost intelligence/);
    expect(activeCopy).toMatch(/Recorded decisions/);
  });

  it("does not ship old placeholders, fake proof, or unsupported claims", () => {
    const activeCopy = readActiveHomepageSource();

    expect(activeCopy).not.toMatch(/Product walkthrough placeholder/i);
    expect(activeCopy).not.toMatch(/data-launch-feature-video-placeholder/);
    expect(activeCopy).not.toMatch(/data-youtube-video-placeholder/);
    expect(activeCopy).not.toMatch(/Trusted by|Used by|Customers include/i);
    expect(activeCopy).not.toMatch(/10x|AI-powered|all-in-one platform/i);
  });
});
