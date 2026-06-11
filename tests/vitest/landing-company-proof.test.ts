import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

describe("landing page capability rows and Lenis integration", () => {
  it("keeps the locked hero first and inserts the capability rows before the product showcase", () => {
    const page = readProjectFile("src/app/page.tsx");

    expect(page.indexOf("<HeroSection")).toBeGreaterThan(-1);
    expect(page.indexOf("<AnimatedProposalRecordSection />")).toBeGreaterThan(
      page.indexOf("<HeroSection"),
    );
    expect(page.indexOf("<ProblemSection />")).toBeGreaterThan(
      page.indexOf("<AnimatedProposalRecordSection />"),
    );
    expect(page.indexOf("<CapabilityRowsSection />")).toBeGreaterThan(
      page.indexOf("<ProblemSection />"),
    );
    expect(page.indexOf("<ProductShowcaseSection />")).toBeGreaterThan(
      page.indexOf("<CapabilityRowsSection />"),
    );
    expect(page.indexOf("<PricingSection />")).toBeGreaterThan(
      page.indexOf("<ProductShowcaseSection />"),
    );
    expect(page.indexOf("<FinalCTASection")).toBeGreaterThan(
      page.indexOf("<PricingSection />"),
    );
    expect(page.indexOf("<LandingFooter />")).toBeGreaterThan(
      page.indexOf("<FinalCTASection"),
    );
    expect(page).toContain("LandingSmoothScrollProvider");
    expect(page).not.toContain("CompanyProofCarouselSection");
    expect(page).not.toContain("SecondaryClaimSection");
  });

  it("replaces the terracotta drench with paper-surface capability proof rows", () => {
    const section = readProjectFile(
      "src/components/landing/CapabilityRowsSection.tsx",
    );

    // The hero's "See how it works" anchor now lands here.
    expect(section).toContain('id="method"');
    expect(section).toContain("bg-paper-0");

    // Intro block subsumes the retired SecondaryClaimSection copy verbatim.
    expect(section).toContain("Built around construction estimate patterns");
    expect(section).toContain(
      "Workflows designed for every estimating specialty.",
    );
    expect(section).toContain(
      "Every team names scope differently. Archestimator gives the quote enough structure to carry rooms, assemblies, supplier context, allowances, and revisions without flattening the work into one brittle spreadsheet.",
    );

    // Three capability rows carry the former feature-card copy.
    expect(section).toContain("Project-shaped workflow");
    expect(section).toContain(
      "Structure your proposal the way you think about the work",
    );
    expect(section).toContain("Reusable component library");
    expect(section).toContain("Build it once. Use it everywhere.");
    expect(section).toContain("Proposal handoff");
    expect(section).toContain("From costing to client-ready in one flow");

    // Revision history folds into row C as a sub-block.
    expect(section).toContain("Revision history");
    expect(section).toContain(
      "In progress: every change traceable as the quote matures.",
    );

    // The planned tag pairs an icon with text — never color-only.
    expect(section).toContain("Planned");
    expect(section).toMatch(/<Clock[^>]*aria-hidden/);

    // Proof mockups stay decorative with sr-only descriptions.
    expect(section).toContain('aria-hidden="true"');
    expect(section).toContain("sr-only");

    // No drench styling and no resurrected video placeholders.
    expect(section).not.toContain("bg-brand-orange");
    expect(section).not.toContain("video");
    expect(section).not.toMatch(/role="img"/);
  });

  it("keeps the retired drench-section files and placeholders out of the codebase", () => {
    for (const retired of [
      "src/components/landing/CompanyProofCarouselSection.tsx",
      "src/components/landing/SecondaryClaimSection.tsx",
      "src/components/landing/LaunchFeatureHeading.tsx",
      "src/components/landing/company-proof-data.ts",
    ]) {
      expect(existsSync(join(root, retired)), `${retired} should be deleted`).toBe(
        false,
      );
    }

    const barrel = readProjectFile("src/components/landing/index.ts");
    expect(barrel).toContain(
      'export { CapabilityRowsSection } from "./CapabilityRowsSection";',
    );
    expect(barrel).not.toContain("CompanyProofCarouselSection");
    expect(barrel).not.toContain("SecondaryClaimSection");

    const landingSources = readTextFilesRecursively(
      join(root, "src/components/landing"),
    ).join("\n");
    expect(landingSources).not.toContain("data-youtube-video-placeholder");
    expect(landingSources).not.toContain("data-launch-feature-video-placeholder");
    expect(landingSources).not.toContain("Launch feature video");
  });

  it("keeps landing header hash links pointed at rendered below-hero sections", () => {
    const header = readProjectFile("src/components/landing/LandingHeader.tsx");
    const landingSources = [
      readProjectFile("src/components/landing/HeroSection.tsx"),
      readProjectFile("src/components/landing/ProductShowcaseSection.tsx"),
      readProjectFile("src/components/landing/CapabilityRowsSection.tsx"),
      readProjectFile("src/components/landing/SolutionSection.tsx"),
      readProjectFile("src/components/landing/PricingSection.tsx"),
      readProjectFile("src/components/landing/FAQSection.tsx"),
      readProjectFile("src/components/landing/FinalCTASection.tsx"),
      readProjectFile("src/components/landing/LandingFooter.tsx"),
    ].join("\n");
    const hashHrefs = [...header.matchAll(/href: "#([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(hashHrefs).toEqual(["method", "product", "pricing"]);
    for (const hash of hashHrefs) {
      expect(landingSources).toMatch(new RegExp(`id=['\"]${hash}['\"]`));
    }

    // Flat anchor nav replaced the Platform/Specialties/Company dropdowns.
    expect(header).toContain('label: "How it works"');
    expect(header).toContain('label: "Product"');
    expect(header).toContain('label: "Beta & pricing"');
    expect(header).toContain('label: "Contact", href: "/contact"');
    expect(header).not.toContain('label: "Platform"');
    expect(header).not.toContain('label: "Specialties"');
    expect(header).not.toContain('label: "Company"');

    // The dark color-swap watches the petrol product band, the clay final
    // CTA, and the footer — not just the footer.
    expect(header).toContain('document.getElementById("product")');
    expect(header).toContain('data-landing-dark-section="true"');
    expect(header).toContain('data-visual-reference="amigo-footer"');
  });

  it("wires the footer cookie-settings link to the consent banner", () => {
    const footer = readProjectFile("src/components/landing/LandingFooter.tsx");
    const banner = readProjectFile(
      "src/components/landing/CookieConsentBanner.tsx",
    );
    const consentLib = readProjectFile("src/lib/landing/consent.ts");
    const finalCta = readProjectFile(
      "src/components/landing/FinalCTASection.tsx",
    );

    // Footer exposes a Cookie settings trigger and drops the borrowed
    // lavender accents for linework-petrol-derived tints.
    expect(footer).toContain('data-cookie-settings-trigger="true"');
    expect(footer).toContain("requestLandingCookieSettings");
    expect(footer).toContain("Cookie settings");
    expect(footer).not.toContain("#d8c3d2");
    expect(footer).toContain("#5d7a82");

    // The banner listens for the footer's open request and hides the
    // floating chip once a decision exists and the footer link is present.
    expect(consentLib).toContain("LANDING_CONSENT_OPEN_SETTINGS_EVENT");
    expect(banner).toContain("LANDING_CONSENT_OPEN_SETTINGS_EVENT");
    expect(banner).toContain("data-cookie-settings-trigger");

    // The final CTA is the page's only clay-drenched band and carries the
    // dark-section marker the header observes.
    expect(finalCta).toContain("bg-brand-clay");
    expect(finalCta).toContain('data-landing-dark-section="true"');
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
    // Vendor CSS is landing-scoped: it ships with the provider, not the root layout.
    expect(provider).toContain('import "lenis/dist/lenis.css";');
    expect(layout).not.toContain("lenis");
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

  it("keeps the retired Neat hero canvas out of the codebase", () => {
    expect(
      existsSync(join(root, "src/components/landing/NeatWireframeBackground.tsx")),
    ).toBe(false);
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
