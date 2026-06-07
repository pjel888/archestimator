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

describe("landing page proof policy and Lenis integration", () => {
  it("keeps the home page focused after the hero", () => {
    const page = readProjectFile("src/app/page.tsx");
    const orderedSections = [
      "<HeroSection",
      "<SecondaryClaimSection",
      "<PricingSection",
      "<FinalCTASection",
    ];

    for (let index = 0; index < orderedSections.length - 1; index += 1) {
      expect(page.indexOf(orderedSections[index])).toBeGreaterThan(-1);
      expect(page.indexOf(orderedSections[index + 1])).toBeGreaterThan(
        page.indexOf(orderedSections[index]),
      );
    }

    expect(page).not.toContain("<CompanyProofCarouselSection");
    expect(page).not.toContain("<ProductShowcaseSection");
    expect(page).not.toContain("<SolutionSection");
    expect(page).not.toContain("<WorkflowStoryboardSection");
    expect(page).not.toContain("<WorkflowVideoPlaceholderSection");
    expect(page).toContain("LandingSmoothScrollProvider");
    expect(page).toContain("<LandingFooter isLoggedIn={isLoggedIn} />");
  });

  it("uses compact workflow proof instead of fake customer logos or mockup cards", () => {
    const page = readProjectFile("src/app/page.tsx");
    const method = readProjectFile(
      "src/components/landing/SecondaryClaimSection.tsx",
    );
    const index = readProjectFile("src/components/landing/index.ts");
    const combined = `${page}\n${method}\n${index}`;

    expect(page).not.toContain("CompanyProofCarouselSection");
    expect(method).toContain('id="proof"');
    expect(method).toContain("Workflow walkthroughs");
    expect(method).toContain("video placeholder");
    expect(method).not.toContain("Video slot");
    expect(method).not.toContain("Planned video");
    expect(method).not.toContain("Not claimed");
    expect(method).not.toContain("Recording slot");
    expect(method).not.toContain("No faux app screenshots");
    expect(combined).not.toMatch(/Trusted by|Used by|Customers include|Northline Builders|Formworks Studio/);
  });

  it("keeps landing header hash links pointed at rendered below-hero sections", () => {
    const header = readProjectFile("src/components/landing/LandingHeader.tsx");
    const landingSources = [
      readProjectFile("src/components/landing/SecondaryClaimSection.tsx"),
      readProjectFile("src/components/landing/PricingSection.tsx"),
      readProjectFile("src/components/landing/FinalCTASection.tsx"),
      readProjectFile("src/components/landing/LandingFooter.tsx"),
    ].join("\n");
    const hashHrefs = [...header.matchAll(/href: "#([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(hashHrefs).toEqual(["method", "access", "contact"]);
    for (const hash of hashHrefs) {
      expect(landingSources).toMatch(new RegExp(`id=['\"]${hash}['\"]`));
    }
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
