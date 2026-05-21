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

    expect(page).toContain("LandingSmoothScrollProvider");
    expect(page.indexOf("<HeroSection />")).toBeGreaterThan(-1);
    expect(page.indexOf("<CompanyProofCarouselSection />")).toBeGreaterThan(page.indexOf("<HeroSection />"));
    expect(page.indexOf("<ProductShowcaseSection />")).toBeGreaterThan(page.indexOf("<CompanyProofCarouselSection />"));
    expect(page.indexOf("<LandingFooter />")).toBeGreaterThan(page.indexOf("<FinalCTASection />"));
  });

  it("marks company carousel data as placeholder scaffolding instead of real social proof", () => {
    const data = readProjectFile("src/components/landing/company-proof-data.ts");
    const section = readProjectFile("src/components/landing/CompanyProofCarouselSection.tsx");

    expect(data).toContain('relationship: "placeholder"');
    expect(data).toContain("permissionConfirmed: false");
    expect(data).toContain("isPlaceholder: true");
    expect(data).toContain("Real customer proof will replace this rail before any public trust claim");
    expect(section).toContain("getRenderableCompanyProofItems");
    expect(section).toContain('data-company-proof-state={proofState}');
    expect(section).toContain('data-placeholder={item.isPlaceholder ? "true" : undefined}');
    expect(section).toContain("Pause rail");
    expect(section).toContain("Resume rail");
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
    const hashHrefs = [...header.matchAll(/href: "#([^"]+)"/g)].map((match) => match[1]);

    expect(hashHrefs).toEqual(["product", "method", "solutions", "pricing", "contact"]);
    for (const hash of hashHrefs) {
      expect(landingSources).toMatch(new RegExp(`id=['\"]${hash}['\"]`));
    }
  });

  it("uses CSS marquee motion with reduced-motion fallback inside a light full-width rail", () => {
    const section = readProjectFile("src/components/landing/CompanyProofCarouselSection.tsx");
    const globals = readProjectFile("src/app/globals.css");

    expect(section).toContain("landing-company-carousel-viewport");
    expect(section).toContain("w-full overflow-hidden border-y");
    expect(section).toContain("bg-[#f8f6f1]");
    expect(section).toContain("useState");
    expect(section).not.toContain("landing-company-marquee-paused");
    expect(section).toContain("aria-controls=\"company-proof-rail\"");
    expect(section).toContain("aria-pressed={isRailPaused}");
    expect(section).toContain('data-company-proof-paused={isRailPaused ? "true" : "false"}');
    expect(section).toContain('aria-hidden={duplicate ? "true" : undefined}');
    expect(globals).toContain("@keyframes landing-company-marquee");
    expect(globals).toContain("--landing-company-marquee-gap");
    expect(globals).not.toContain("landing-company-marquee-paused");
    expect(globals).toContain('.landing-company-carousel-viewport[data-company-proof-paused="true"] .landing-company-marquee');
    expect(globals).toContain('.landing-company-marquee > [aria-hidden="true"]');
    expect(globals).toContain("prefers-reduced-motion: reduce");
    expect(globals).toContain("animation: none");
  });

  it("scopes Lenis to the public landing wrapper and preserves reduced-motion users", () => {
    const provider = readProjectFile("src/components/landing/LandingSmoothScrollProvider.tsx");
    const controller = readProjectFile("src/components/landing/LandingSnapController.tsx");
    const layout = readProjectFile("src/app/layout.tsx");
    const globals = readProjectFile("src/app/globals.css");
    const packageJson = readProjectFile("package.json");

    expect(packageJson).toContain('"lenis"');
    expect(layout).toContain('import "lenis/dist/lenis.css";');
    expect(provider).toMatch(/import \{[^}]*ReactLenis[^}]*\} from "lenis\/react"/);
    expect(provider).toContain("(prefers-reduced-motion: reduce)");
    expect(provider).toContain("if (prefersReducedMotion)");
    expect(provider).toContain("lerp: 0.105");
    expect(provider).toContain("wheelMultiplier: 0.86");
    expect(provider).toContain("<ReactLenis");
    expect(provider).toContain("root");
    expect(provider).toContain("options={landingLenisOptions}");
    expect(provider).toContain("data-lenis-prevent");
    expect(controller).toContain("SNAP_KEYBOARD_IGNORE_SELECTOR");
    expect(controller).toContain("SNAP_WHEEL_IGNORE_SELECTOR");
    expect(controller).toContain('"button"');
    expect(controller).toContain('"[role=\'tab\']"');
    expect(controller).toContain("USER_SCROLL_SETTLE_DELAY_MS");
    expect(controller).toContain("landing-soft-settle");
    expect(controller).toContain('window.addEventListener("wheel", onWheel, { passive: true, capture: true })');
    expect(controller).not.toContain('window.addEventListener("wheel", onWheel, { passive: false })');
    expect(controller).not.toContain("lock: true");
    expect(globals).not.toContain("scroll-snap-type: y mandatory");
    expect(globals).not.toContain("scroll-snap-stop: always");
    expect(globals).toContain("scroll-snap-type: none");
    expect(globals).toContain("scroll-margin-top: 68px");
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
