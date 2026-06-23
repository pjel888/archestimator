import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LandingPage from "@/app/page";

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const deletedGeneratedComponent = "AecCost" + "IntelligenceLandingPage";
const deletedResetComponent = "Redesigned" + "LandingPage";
const deletedNamespace = "gpt" + "-taste";

function readTextFilesRecursively(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) return readTextFilesRecursively(entryPath);
    if (!/\.(ts|tsx)$/.test(entryPath)) return [];
    return readFileSync(entryPath, "utf8");
  });
}

const readActiveHomepageSource = () =>
  [
    readProjectFile("src/app/page.tsx"),
    ...readTextFilesRecursively(join(process.cwd(), "src/components/frontdoor")),
  ].join("\n");

describe("frontdoor homepage contract", () => {
  it("renders the cost-intelligence homepage with real estimating workflow content", async () => {
    render(await LandingPage());

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("data-frontdoor-root", "cost-intelligence");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your cost intelligence workspace.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Build from your own prices and suppliers, keep every revision traceable/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Built for the people around the estimate." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The estimate-to-proposal loop, on the record." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Less spreadsheet drift. More estimate control." })).toBeInTheDocument();
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
    const activeCopy = readActiveHomepageSource();

    expect(activeCopy).not.toMatch(new RegExp(["M", "VP"].join(""), "i"));
    expect(activeCopy).not.toMatch(new RegExp(["pre", "launch"].join("-"), "i"));
    expect(activeCopy).not.toMatch(new RegExp("closed-" + "beta", "i"));
    expect(activeCopy).not.toMatch(/early access/i);
    expect(activeCopy).not.toMatch(/Pre-launch MVP preview/i);
    expect(activeCopy).not.toMatch(new RegExp("for " + "contractors", "i"));
    expect(activeCopy).not.toMatch(new RegExp("Contractor " + "bid desk", "i"));
  });

  it("keeps homepage proof product-native instead of fake proof or visible filler", () => {
    const activeCopy = readActiveHomepageSource();

    expect(activeCopy).not.toMatch(/Trusted by|Used by|Customers include|testimonial/i);
    expect(activeCopy).not.toMatch(/placeholder/i);
    expect(activeCopy).not.toMatch(/10x|AI-powered|all-in-one platform/i);
  });
});
