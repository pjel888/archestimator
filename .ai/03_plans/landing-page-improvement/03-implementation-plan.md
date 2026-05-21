# Landing Page Implementation Plan

**Date:** 2026-05-21
**Status:** Plan only; do not implement until Philip approves the direction or asks to proceed.
**Current focus:** Placeholder-safe full-width company carousel immediately after the locked hero, landing-only Lenis smooth-scroll enhancement, then below-carousel container/focused-middle layout, brand/copy cleanup, and optional microinteractions.
**Hard boundary:** The accepted hero/above-fold must not be changed in the current pass.

## Expected files

Likely files to modify:

- Create `src/components/landing/CompanyProofCarouselSection.tsx` for the full-width post-hero company/logo marquee.
- Optional create `src/components/landing/company-proof-data.ts` for placeholder-first, then verified proof data.
- Optional create `src/components/landing/LandingSmoothScrollProvider.tsx` for a landing-only Lenis client enhancement.
- `src/app/page.tsx` to place `CompanyProofCarouselSection` immediately after `HeroSection` and wrap landing content with the Lenis provider if approved.
- `src/app/layout.tsx` only if `lenis/dist/lenis.css` must be imported globally for Next.
- `package.json` and lockfile only if Lenis implementation is approved (`bun add lenis`).
- `src/components/landing/index.ts` to export the new section/provider as needed.
- `src/components/landing/HeroSection.tsx` — only `ProductShowcaseSection`; do not touch the `HeroSection` hero function in this pass.
- `src/components/landing/ProductPreview.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/EstimatorEngineSection.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/PartnerSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/PlaceholderMedia.tsx` if keeping it as an internal helper only
- Optional assets under `public/company-logos/*` if local logo files are approved and permission-safe

Conditional files only if scope expands:

- `src/components/landing/LandingHeader.tsx` if nav anchors change.
- `src/components/landing/SectionIntro.tsx` if shared intro width/spacing is centralized.
- `src/components/landing/CtaLink.tsx` if CTA focus/hover behavior is adjusted.

Likely tests to add/update:

- `tests/vitest/landing-page.test.tsx` or focused component tests under `tests/vitest/`
- `e2e/landing-page.spec.ts` if browser route coverage is approved for the public landing page

## Slice 0 — Baseline evidence

**Objective:** Capture current source/rendered behavior before editing.

Steps:

1. Run `git status --short --branch` and note active branch/dirty files.
2. Read `src/app/page.tsx` and `src/components/landing/*`.
3. Run the app locally if needed and capture desktop + mobile screenshots of `/`.
4. Confirm whether the hero is in scope or locked for this pass.
5. Record any visible `placeholder` labels, nav mismatches, or broken CTA paths.

Acceptance:

- Current landing section order is documented.
- Hero scope is explicitly known.
- Screenshot/browser evidence exists if implementation proceeds.

## Slice 1 — Full-width company proof carousel

**Objective:** Add a placeholder-safe companies-who-use-us carousel immediately after the locked hero, spanning the full viewport width instead of the focused middle container.

References:

- `10-conversion-flow-and-company-carousel-research.md`
- `07-below-hero-container-layout-plan.md`

Steps:

1. Start with placeholder company/logo entries if real proof is not ready, but mark each placeholder explicitly in data.
2. Do not use real-logo/customer wording until the company list is real, permission-safe, and accurately worded.
3. Create `CompanyProofCarouselSection` as a full-bleed section with an edge-to-edge logo track.
4. Place it in `src/app/page.tsx` immediately after `HeroSection`.
5. Export it from `src/components/landing/index.ts`.
6. Use CSS marquee behavior only; no GSAP or Lenis is needed for the horizontal carousel.
7. Add a reduced-motion fallback that stops continuous auto-scroll.
8. Before production launch, either replace placeholders with verified proof or keep neutral/non-proof wording approved by Philip.

Acceptance:

- Hero/above-fold is unchanged.
- Carousel appears immediately after the hero.
- Logo track spans the full viewport and is not constrained by `container`/`max-w-*`.
- No unverified companies, fake logos, fake customer claims, or mismatched relationship labels render as real proof.
- Placeholder entries are explicitly marked and use neutral/non-proof wording until replaced.
- Reduced-motion users are not forced into continuous scrolling.

## Slice 2 — Landing-only Lenis smooth-scroll enhancement

**Objective:** Add Lenis as a controlled landing-page smooth-scroll enhancement without changing app/workshop scroll behavior.

Reference: `11-lenis-smooth-scroll-and-placeholder-company-proof-plan.md`.

Steps:

1. Install only when implementation is approved: `bun add lenis`.
2. Create `LandingSmoothScrollProvider` as a small client component using `ReactLenis` from `lenis/react`.
3. Import `lenis/dist/lenis.css` in the safest Next-supported location, likely `src/app/layout.tsx`, while mounting the provider only on `/`.
4. Disable Lenis when `prefers-reduced-motion: reduce` is active.
5. Keep the company carousel CSS-driven; do not use Lenis for the horizontal marquee.
6. Do not mount Lenis on `/workshop` or authenticated app routes.
7. Use `data-lenis-prevent` or Lenis `prevent` only if future landing nested-scroll elements require native scroll.

Acceptance:

- `lenis` is installed only after approval and appears in `package.json`/lockfile.
- Smooth scrolling applies to `/` only.
- Reduced-motion mode disables Lenis.
- Header anchors still land correctly.
- No workshop/app scroll behavior changes.
- No hydration/runtime errors appear.

## Slice 3 — Below-carousel container/focused-middle pass

**Objective:** Put every substantive section after the company carousel inside a focused Tailwind container while preserving full-bleed section backgrounds and borders.

Reference: `07-below-hero-container-layout-plan.md`.

Steps:

1. Keep each substantive post-carousel `<section>` full-bleed for background/border/rhythm.
2. Add per-section centered content wrappers using `container mx-auto px-4 sm:px-6 lg:px-8` plus an inner `max-w-*`.
3. Use wider widths for product/feature proof surfaces and narrower widths for claim/pricing/CTA copy.
4. Do not wrap all below-hero sections in one page-level container.
5. Preserve the company carousel as the one full-width exception.
6. Touch `src/components/landing/HeroSection.tsx` only for `ProductShowcaseSection` if needed.
7. Do not add animation or new packages in this slice.

Acceptance:

- Hero/above-fold is unchanged.
- Below-carousel content is focused in the center at desktop widths.
- Full-bleed section backgrounds still span the viewport.
- No horizontal overflow appears at mobile, tablet, or desktop widths.
- App/workshop layout and typography rules are unchanged.

## Slice 4 — Section architecture cleanup

**Objective:** Make the page story clearer without changing app/workshop functionality.

Steps:

1. Decide the final section order from `10-conversion-flow-and-company-carousel-research.md` and `02-ux-improvement-plan.md`.
2. Remove or merge sections that repeat the same message without adding proof.
3. Keep `CompanyProofCarouselSection` immediately after the hero when placeholder or verified proof data exists.
4. Keep `ProductShowcaseSection` immediately after the carousel as the primary product proof surface.
5. Align header nav hrefs and labels to actual section purposes.
6. Keep CTA destinations consistent with `loginHref` and `workshopHref`.

Acceptance:

- Source order matches the planned narrative.
- Nav labels land on meaningful sections.
- The page is shorter or clearer; it does not become a larger repeated-card page.

## Slice 5 — Replace placeholder visuals

**Objective:** Remove public-facing placeholder labels and replace them with credible visual proof.

Steps:

1. Search for public-facing placeholder labels in `src/components/landing`.
2. Replace generic placeholder blocks with one of:
   - intentional product mockup panels;
   - current-workshop-informed static screenshots/mockups;
   - branded diagrams explaining the workflow.
3. Preserve honest MVP-preview framing if the visual is illustrative rather than fully live.
4. Ensure visuals remain responsive and do not introduce horizontal overflow.

Acceptance:

- No rendered landing copy contains `placeholder`.
- Product visuals explain estimating workflow, not generic SaaS decoration.
- Mobile layout remains readable.

## Slice 6 — Copy tightening

**Objective:** Keep the strongest approved claims while making each section earn its place.

Steps:

1. Keep public feature anchors from `.ai/10_state/decisions.md`.
2. Reduce repeated body copy between Solution, Engine, Features, Partner, and Pricing sections.
3. Make each section answer a distinct visitor question:
   - What is it?
   - How does it work?
   - Why is it faster?
   - What outputs do I get?
   - Is it ready/preview?
4. Avoid fake proof and unsupported market leadership.

Acceptance:

- Copy is specific to construction cost estimating.
- No fake logos/testimonials/metrics appear.
- `MVP preview` remains honest.

## Slice 7 — Tests and static checks

**Objective:** Protect the approved landing-page behavior.

Steps:

1. Add focused tests for section order and key copy anchors if the testing setup can render the page/components cleanly.
2. Add a guard that public rendered landing text does not include literal `placeholder` labels while allowing explicitly marked placeholder source data during the first carousel build.
3. Add browser E2E route coverage for `/` only if approved as part of this slice.
4. Run validation.

Commands:

```bash
bun run validate
bun run build
git diff --check
```

If browser E2E is added:

```bash
bun run test:e2e -- landing-page
```

Acceptance:

- Validation passes, or failures are documented as pre-existing/unrelated.
- Landing tests protect section order, company-carousel placeholder/truth gates, key copy, CTA destinations, reduced-motion behavior, and absence of visible literal placeholder labels.

## Slice 8 — Browser QA and review

**Objective:** Verify the page as a visitor would see it.

Steps:

1. Inspect `/` at desktop and mobile widths.
2. Check header sticky behavior and section anchors.
3. Check CTA destinations in logged-out and, if feasible, logged-in states.
4. Check hero/product-preview fold relationship.
5. Check no app/workshop typography or layout rules were accidentally changed.
6. Check Lenis behavior if implemented: smooth vertical scroll on `/`, no reduced-motion activation, no anchor offset problems.
7. Run an independent review pass focused on clarity, credibility, and visual hierarchy.

Acceptance:

- Visitor can understand the Archestimator method without reading internal docs.
- No visible literal `placeholder` labels remain unless Philip explicitly approves a non-production preview state.
- No fake proof appears.
- CTAs route cleanly.
- Landing changes are isolated to public landing files/tests.
