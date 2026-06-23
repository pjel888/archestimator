import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LandingPage from "@/app/page";

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const deletedGeneratedComponent = "AecCost" + "IntelligenceLandingPage";
const deletedResetComponent = "Redesigned" + "LandingPage";
const deletedNamespace = "gpt" + "-taste";

describe("frontdoor homepage contract", () => {
  it("renders the bid-desk homepage with real estimating workflow content", async () => {
    render(await LandingPage());

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("data-frontdoor-root", "bid-desk");
    expect(screen.getByRole("heading", { level: 1, name: "Connected estimating workspace." })).toBeInTheDocument();
    expect(
      screen.getByText("Technical estimating workspace for teams that price, review, and send work."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "One workflow instead of three handoffs." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Built for the people around the estimate." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No fake proof. No borrowed maturity." })).toBeInTheDocument();
  });

  it("keeps the active homepage routed to the new frontdoor namespace only", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page).toContain("@/components/frontdoor");
    expect(page).not.toContain("@/components/home");
    expect(page).not.toContain(deletedGeneratedComponent);
    expect(page).not.toContain(deletedResetComponent);
    expect(page).not.toContain(deletedNamespace);
  });

  it("keeps the active public copy out of rejected positioning language", () => {
    const page = readProjectFile("src/app/page.tsx");
    const frontdoor = readProjectFile("src/components/frontdoor/FrontdoorPage.tsx");
    const activeCopy = `${page}\n${frontdoor}`;

    expect(activeCopy).not.toMatch(new RegExp(["M", "VP"].join(""), "i"));
    expect(activeCopy).not.toMatch(new RegExp(["pre", "launch"].join("-"), "i"));
    expect(activeCopy).not.toMatch(new RegExp("closed-" + "beta", "i"));
    expect(activeCopy).not.toMatch(new RegExp("for " + "contractors", "i"));
    expect(activeCopy).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
  });
});
