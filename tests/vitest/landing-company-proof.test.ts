import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getRenderableCompanyProofItems,
  type CompanyProofLogo,
} from "../../src/components/landing/company-proof-data";

const root = process.cwd();
const readProjectFile = (path: string) =>
  readFileSync(join(root, path), "utf8");

function readTextFilesRecursively(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return readTextFilesRecursively(entryPath);
    }

    if (!/\.(ts|tsx)$/.test(entryPath)) {
      return [];
    }

    return readFileSync(entryPath, "utf8");
  });
}

describe("landing page company proof and Lenis integration", () => {
  it("keeps the locked hero first and inserts the company proof carousel before the product showcase", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page.indexOf("<HeroSection")).toBeGreaterThan(-1);
    expect(page.indexOf("<CompanyProofCarouselSection />")).toBeGreaterThan(
      page.indexOf("<HeroSection"),
    );
    expect(page.indexOf("<ProductShowcaseSection />")).toBeGreaterThan(
      page.indexOf("<CompanyProofCarouselSection />"),
    );
    expect(page.indexOf("<LandingFooter />")).toBeGreaterThan(
      page.indexOf("<FinalCTASection />"),
    );
    expect(page).toContain("LandingSmoothScrollProvider");
  });

  it("marks company carousel data as placeholder scaffolding instead of real social proof", () => {
    const data = readProjectFile(
      "src/components/landing/company-proof-data.ts",
    );
    const section = readProjectFile(
      "src/components/landing/CompanyProofCarouselSection.tsx",
    );

    expect(data).toContain('relationship: "placeholder"');
    expect(data).toContain("permissionConfirmed: false");
    expect(data).toContain("isPlaceholder: true");
    expect(data).toContain(
      "Real customer proof will replace this rail before any public trust claim",
    );
    expect(section).toContain("getRenderableCompanyProofItems");
    expect(section).toContain("data-company-proof-state={proofState}");
    expect(section).toContain(
      'data-placeholder={item.isPlaceholder ? "true" : undefined}',
    );
    expect(section).not.toContain("Pause rail");
    expect(section).not.toContain("Resume rail");
    expect(section).not.toMatch(/Trusted by|Used by|Customers include/);
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

    expect(
      getRenderableCompanyProofItems([unconfirmedCustomer, placeholder]),
    ).toEqual({
      items: [placeholder],
      state: "placeholder",
    });
    expect(getRenderableCompanyProofItems([unconfirmedCustomer])).toEqual({
      items: [],
      state: "placeholder",
    });
    expect(
      getRenderableCompanyProofItems([
        placeholder,
        verifiedCustomer,
        unconfirmedCustomer,
      ]),
    ).toEqual({
      items: [verifiedCustomer],
      state: "verified",
    });
  });

  it("keeps landing header hash links pointed at rendered below-hero sections", () => {
    const header = readProjectFile("src/components/landing/LandingHeader.tsx");
    const landingSources = [
      readProjectFile("src/components/landing/HeroSection.tsx"),
      readProjectFile("src/components/landing/ProductShowcaseSection.tsx"),
      readProjectFile("src/components/landing/SecondaryClaimSection.tsx"),
      readProjectFile("src/components/landing/SolutionSection.tsx"),
      readProjectFile("src/components/landing/PricingSection.tsx"),
      readProjectFile("src/components/landing/FinalCTASection.tsx"),
      readProjectFile("src/components/landing/LandingFooter.tsx"),
    ].join("\n");
    const hashHrefs = [...header.matchAll(/href: "#([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(hashHrefs).toEqual([
      "product",
      "method",
      "solutions",
      "pricing",
      "contact",
    ]);
    for (const hash of hashHrefs) {
      expect(landingSources).toMatch(new RegExp(`id=['\"]${hash}['\"]`));
    }
  });

  it("uses CSS marquee motion with reduced-motion fallback inside a light full-width rail", () => {
    const section = readProjectFile(
      "src/components/landing/CompanyProofCarouselSection.tsx",
    );
    const globals = readProjectFile("src/app/globals.css");

    expect(section).toContain("landing-company-carousel-viewport");
    expect(section).toContain("w-full overflow-hidden border-y");
    expect(section).toContain("bg-[#f8f6f1]");
    expect(section).not.toContain("landing-company-marquee-paused");
    expect(section).not.toContain("useState");
    expect(section).not.toContain('aria-controls="company-proof-rail"');
    expect(section).not.toContain("aria-pressed=");
    expect(section).not.toContain("data-company-proof-paused");
    expect(section).toContain('aria-hidden={duplicate ? "true" : undefined}');
    expect(globals).toContain("@keyframes landing-company-marquee");
    expect(globals).toContain("--landing-company-marquee-gap");
    expect(globals).not.toContain("landing-company-marquee-paused");
    expect(globals).not.toContain("data-company-proof-paused");
    expect(globals).toContain(
      '.landing-company-marquee > [aria-hidden="true"]',
    );
    expect(globals).toContain("prefers-reduced-motion: reduce");
    expect(globals).toContain("animation: none");
  });

  it("scopes Lenis to the home landing wrapper and preserves native non-home scrolling", () => {
    const provider = readProjectFile(
      "src/components/landing/LandingSmoothScrollProvider.tsx",
    );
    const homePage = readProjectFile("src/app/page.tsx");
    const publicShell = readProjectFile("src/components/landing/PublicPageShell.tsx");
    const layout = readProjectFile("src/app/layout.tsx");
    const globals = readProjectFile("src/app/globals.css");
    const packageJson = readProjectFile("package.json");

    expect(packageJson).toContain('"lenis"');
    expect(layout).toContain('import "lenis/dist/lenis.css";');
    expect(homePage).toContain("<LandingSmoothScrollProvider>");
    expect(publicShell).not.toContain("LandingSmoothScrollProvider");
    expect(publicShell).toContain('<main data-landing-page-root="true">');
    expect(provider).toMatch(
      /import \{[^}]*ReactLenis[^}]*\} from "lenis\/react"/,
    );
    expect(provider).toContain("(prefers-reduced-motion: reduce)");
    expect(provider).toContain("if (prefersReducedMotion)");
    expect(provider).toContain("lerp: 0.105");
    expect(provider).toContain("wheelMultiplier: 0.86");
    expect(provider).toContain("<ReactLenis");
    expect(provider).toContain("root");
    expect(provider).toContain("options={landingLenisOptions}");
    expect(provider).toContain("data-lenis-prevent");

    // Settle/snap controller should be removed for smooth free scrolling
    expect(
      existsSync(
        join(root, "src/components/landing/LandingSnapController.tsx"),
      ),
    ).toBe(false);
    expect(provider).not.toContain("LandingSnapController");

    expect(globals).not.toContain("scroll-snap-type: y mandatory");
    expect(globals).not.toContain("scroll-snap-stop: always");
    expect(globals).toContain("scroll-snap-type: none");
    expect(globals).toContain("scroll-margin-top: 68px");
  });

  it("keeps the Neat hero canvas off the mobile/reduced-motion critical path", () => {
    const neat = readProjectFile(
      "src/components/landing/NeatWireframeBackground.tsx",
    );

    expect(neat).toContain("shouldUseStaticNeatFallback");
    expect(neat).toContain("(prefers-reduced-motion: reduce)");
    expect(neat).toContain("(pointer: coarse)");
    expect(neat).toContain("(max-width: 767px)");
    expect(neat).toContain("requestIdleCallback");
    expect(neat).toContain("cancelIdleCallback");
    expect(neat).toContain("setTimeout");
    expect(neat).toContain("await import('@firecms/neat')");
    expect(neat).toContain("data-neat-static-fallback");
    expect(neat).toContain("gradient?.destroy()");
  });

  it("does not import the landing Lenis provider from workshop surfaces", () => {
    const workshopSource = [
      ...readTextFilesRecursively(join(root, "src/app/workshop")),
      ...readTextFilesRecursively(join(root, "src/components/workshop")),
    ].join("\n");

    expect(workshopSource).not.toContain("LandingSmoothScrollProvider");
    expect(workshopSource).not.toContain("lenis/react");
  });
});
