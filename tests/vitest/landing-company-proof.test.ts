import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import {
  getRenderableCompanyProofItems,
  type CompanyProofLogo,
} from "../../src/components/landing/company-proof-data";

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), "utf8");

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

describe("landing page proof boundaries", () => {
  it("keeps company proof data fail-closed and unused by the active homepage", () => {
    const data = readProjectFile("src/components/landing/company-proof-data.ts");
    const activePage = readProjectFile("src/components/landing/gpt-taste/RedesignedLandingPage.tsx");

    expect(data).toContain('relationship: "placeholder"');
    expect(data).toContain("permissionConfirmed: false");
    expect(data).toContain("isPlaceholder: true");
    expect(activePage).not.toContain("getRenderableCompanyProofItems");
    expect(activePage).not.toContain("placeholderCompanyProof");
    expect(activePage).not.toMatch(/Trusted by|Used by|Customers include|testimonial/i);
  });

  it("fails closed to placeholder-only data when candidate proof is unconfirmed", () => {
    const placeholder: CompanyProofLogo = {
      name: "Sample Builder",
      initials: "SB",
      relationship: "placeholder",
      permissionConfirmed: false,
      isPlaceholder: true,
      publicLabel: "Sample profile",
      workflowFit: "Estimate workspace preview",
    };
    const unconfirmedCustomer: CompanyProofLogo = {
      name: "Unconfirmed Customer",
      initials: "UC",
      relationship: "customer",
      permissionConfirmed: false,
      publicLabel: "Customer",
      workflowFit: "Should not render",
    };
    const verifiedCustomer: CompanyProofLogo = {
      name: "Verified Customer",
      initials: "VC",
      relationship: "customer",
      permissionConfirmed: true,
      publicLabel: "Customer",
      workflowFit: "Confirmed proof",
    };

    expect(getRenderableCompanyProofItems([unconfirmedCustomer, placeholder])).toEqual({
      items: [placeholder],
      state: "placeholder",
    });
    expect(getRenderableCompanyProofItems([unconfirmedCustomer])).toEqual({
      items: [],
      state: "placeholder",
    });
    expect(getRenderableCompanyProofItems([placeholder, verifiedCustomer, unconfirmedCustomer])).toEqual({
      items: [verifiedCustomer],
      state: "verified",
    });
  });

  it("keeps landing-specific GSAP off workshop surfaces", () => {
    const workshopSource = [
      ...readTextFilesRecursively(join(root, "src/app/workshop")),
      ...readTextFilesRecursively(join(root, "src/components/workshop")),
    ].join("\n");

    expect(workshopSource).not.toContain("LandingGsapMotion");
    expect(workshopSource).not.toContain("HeroSignalField");
    expect(workshopSource).not.toContain("gsap/ScrollTrigger");
  });

  it("does not use the rejected home Lenis wrapper in the active page", () => {
    const page = readProjectFile("src/app/page.tsx");
    const packageJson = readProjectFile("package.json");

    expect(packageJson).toContain('"gsap"');
    expect(packageJson).toContain('"@gsap/react"');
    expect(page).not.toContain("LandingSmoothScrollProvider");
    expect(page).toContain("RedesignedLandingPage");
  });
});
