import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const newLandingPage = readFileSync(
  "src/app/new/_components/new-landing-page.tsx",
  "utf8",
);
const kimiHeroImage = readFileSync(
  "src/app/kimi3d/_components/hero-voxel-ripple-image.tsx",
  "utf8",
);

describe("public image/font LCP source contract", () => {
  it("keeps public next/font loaders on swap with their CSS variables applied", () => {
    expect(rootLayout).toContain(
      'import { Plus_Jakarta_Sans, Roboto_Mono } from "next/font/google";',
    );
    expect(rootLayout).toMatch(
      /const plusJakartaSans = Plus_Jakarta_Sans\(\{\s*subsets: \["latin"\],\s*variable: "--font-plus-jakarta",\s*display: "swap",\s*\}\);/,
    );
    expect(rootLayout).toMatch(
      /const robotoMono = Roboto_Mono\(\{\s*subsets: \["latin"\],\s*variable: "--font-roboto-mono",\s*display: "swap",\s*\}\);/,
    );
    expect(rootLayout).toContain(
      'className={`${plusJakartaSans.variable} ${robotoMono.variable}`}',
    );

    expect(newLandingPage).toContain(
      'import { Jersey_25 } from "next/font/google";',
    );
    expect(newLandingPage).toMatch(
      /const jersey25 = Jersey_25\(\{\s*display: "swap",\s*subsets: \["latin"\],\s*variable: "--font-jersey-25",\s*weight: "400",\s*\}\);/,
    );
    expect(newLandingPage).toContain("jersey25.variable");
  });

  it("preloads the responsive Kimi AVIF hero sources at high priority", () => {
    expect(newLandingPage).toContain(
      'import LandingPageHeroMobileAvif from "../../../../public/landing-hero-day-1280.avif";',
    );
    expect(newLandingPage).toContain(
      'import LandingPageHeroAvif from "../../../../public/landing-hero-day-2400.avif";',
    );
    expect(newLandingPage).toMatch(
      /const heroPreloads = \[\s*\{ media: "\(max-width: 640px\)", src: LandingPageHeroMobileAvif\.src \},\s*\{ media: "\(min-width: 641px\)", src: LandingPageHeroAvif\.src \},\s*\] as const;/,
    );
    expect(newLandingPage).toMatch(
      /preload\(image\.src, \{\s*as: "image",\s*fetchPriority: "high",\s*media: image\.media,\s*type: "image\/avif",\s*\}\);/,
    );
    expect(newLandingPage).toContain("preloadHeroImages();");

    expect(kimiHeroImage).toContain(
      'import LandingPageHeroMobileAvif from "../../../../public/landing-hero-day-1280.avif";',
    );
    expect(kimiHeroImage).toContain(
      'import LandingPageHeroAvif from "../../../../public/landing-hero-day-2400.avif";',
    );
    expect(kimiHeroImage).toMatch(
      /type="image\/avif"\s*media="\(max-width: 640px\)"\s*srcSet=\{LandingPageHeroMobileAvif\.src\}/,
    );
    expect(kimiHeroImage).toMatch(
      /type="image\/avif"\s*media="\(min-width: 641px\)"\s*srcSet=\{LandingPageHeroAvif\.src\}/,
    );
    expect(kimiHeroImage).toContain('fetchPriority="high"');
  });
});
