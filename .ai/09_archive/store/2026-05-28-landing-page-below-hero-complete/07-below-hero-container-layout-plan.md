# Below-Hero Container Layout Plan

**Date:** 2026-05-21
**Status:** Planning only; no code implementation yet.
**Route:** `/` public landing page.
**Primary user request:** Keep the approved hero/above-the-fold unchanged. Put the content below it into Tailwind container/focused-middle layout so the page feels centered, intentional, and easier to read.

## Hard scope boundary

Do not modify the accepted above-the-fold hero for this pass.

Important nuance: `ProductShowcaseSection` currently lives in `src/components/landing/HeroSection.tsx`. If the future implementation touches that file, changes must be limited to the exported `ProductShowcaseSection` below-hero function. The `HeroSection` function, hero copy, and hero visual should remain untouched unless Philip later explicitly reopens hero work.

## Goal

Create a consistent below-hero layout system where most sections remain full-bleed for background and borders, but their actual content is focused in the middle with Tailwind container classes and section-specific inner max widths. The new immediate post-hero company carousel is the intentional exception: its logo track should span/scroll horizontally across the full viewport.

## Non-goals

- No code changes in this planning pass.
- No hero/above-fold redesign.
- No app/workshop layout or typography changes.
- No global Tailwind config change. This repo uses Tailwind v4 through `src/app/globals.css`, not `tailwind.config.*`.
- No fake screenshots, logos, testimonials, or metrics.
- No package installation.

## Current and target below-hero section order

Currently rendered by `src/app/page.tsx` after `HeroSection`:

1. `ProductShowcaseSection`
2. `SecondaryClaimSection`
3. `SolutionSection`
4. `EstimatorEngineSection`
5. `FeaturesSection`
6. `PartnerSection`
7. `PricingSection`
8. `FinalCTASection`

Target order for the next implementation pass:

1. `CompanyProofCarouselSection` — new full-width carousel immediately after the locked hero.
2. `ProductShowcaseSection`
3. `SecondaryClaimSection`
4. `SolutionSection`
5. `EstimatorEngineSection`
6. `FeaturesSection`
7. `PartnerSection` or renamed proof/team/readiness section if it no longer represents real partners.
8. `PricingSection`
9. `FinalCTASection`

## Files expected to change in a future implementation

Primary landing section files:

- Create `src/components/landing/CompanyProofCarouselSection.tsx` for the full-width post-hero logo carousel.
- Optional create `src/components/landing/company-proof-data.ts` if company proof data should be isolated from presentation.
- `src/components/landing/HeroSection.tsx` — only `ProductShowcaseSection`, not `HeroSection`.
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/EstimatorEngineSection.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/PartnerSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/index.ts`
- `src/app/page.tsx` — required to place `CompanyProofCarouselSection` immediately after `HeroSection`.

Conditional files only if needed:

- `src/components/landing/SectionIntro.tsx` — if shared intro width/spacing is centralized.
- `src/components/landing/ProductPreview.tsx` — if the preview itself needs internal width/overflow adjustments.
- `src/components/landing/CtaLink.tsx` — if shared CTA focus/hover behavior is adjusted.
- `src/components/landing/LandingHeader.tsx` — only if anchors/nav labels change.

## Container architecture

### Recommended pattern

Use full-bleed sections with centered inner content:

```tsx
<section className="... full-bleed background/border classes ...">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1120px]">{/* section content */}</div>
  </div>
</section>
```

If Tailwind `container` behavior is too broad or inconsistent for the desired landing rhythm, use the explicit fallback:

```tsx
<div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
  {/* section content */}
</div>
```

### Company carousel exception

The new `CompanyProofCarouselSection` is intentionally different from the normal section pattern:

```tsx
<section className="w-full overflow-hidden border-y ...">
  <p className="... optional centered label ...">Used by...</p>
  <div className="flex min-w-max animate-[...] ...">
    {/* logo track spans full viewport */}
  </div>
</section>
```

Rules:

- Place it immediately after `HeroSection` in `src/app/page.tsx`.
- Do not put the logo track inside `container mx-auto` or `max-w-*`.
- It may have a small centered label, but the scrolling logo rail itself must feel edge-to-edge.
- Use real, verified companies only; if there are no verified logos, the section should not render.
- Use CSS animation and reduced-motion fallback; no GSAP is needed for a marquee.

### Why not one page-level wrapper

Do not wrap all below-hero sections in one global container from `src/app/page.tsx`.

Reason:

- full-bleed background bands and top/bottom borders should still span the viewport;
- each section needs its own visual rhythm;
- product preview sections can be wider than copy-heavy sections;
- CTA/dark footer-like sections should still feel like full-width chapters.

## Section-by-section layout plan

### 1. CompanyProofCarouselSection — full-width exception

- Place immediately after the accepted hero.
- The logo track must span/scroll horizontally across the full viewport, not inside the focused middle container.
- Use only real companies/users/design partners with verified public wording and logo permission.
- If proof is not verified, do not render the section; do not fill it with fake logos.
- Keep the strip visually calm so it builds trust without becoming another hero.
- Use CSS marquee behavior with `prefers-reduced-motion` fallback.

Acceptance:

- Carousel appears immediately after the hero.
- Logo rail is full-width/edge-to-edge.
- No unverified company proof is rendered.
- Reduced-motion users do not receive forced continuous scrolling.

### 2. ProductShowcaseSection

- Keep the section as the first product proof surface after the full-width company carousel.
- Use a wider content width: `max-w-[1180px]` or `max-w-7xl`.
- Keep the product preview substantial, but prevent it from stretching wall-to-wall on large screens.
- Audit `ProductPreview` for horizontal overflow once the parent is narrowed.
- Do not edit the hero function in the same file.

Acceptance:

- The preview feels like a central product surface.
- No desktop edge sprawl.
- No mobile overflow.
- Hero remains unchanged.

### 3. SecondaryClaimSection

- Use a narrower claim/readability width for headline and body: `max-w-[920px]` to `max-w-[1040px]`.
- Keep supporting cards/pillars inside `max-w-[1120px]`.
- Let this section act as the bridge from hero claim to product method.

Acceptance:

- The claim reads as intentional support, not another hero.
- The content column is easy to scan.

### 4. SolutionSection

- Use `max-w-[1120px]` or `max-w-[1180px]` depending on card density.
- Keep intro copy narrower than the grid/cards.
- Use the container to make the workflow look structured and sequential.

Acceptance:

- The section answers “how does it solve estimating mess?”
- Grid/card content no longer spreads into weak edge spacing.

### 5. EstimatorEngineSection

- Use `max-w-[1120px]`.
- Treat it as an explanation band: build → revise → compare → export/explain.
- Good candidate for a later simple visual flow line, but not required for the container pass.

Acceptance:

- The section looks like a focused explanation, not a floating block of copy.

### 6. FeaturesSection

- Use `max-w-[1180px]` for feature cards.
- Keep the approved public feature names intact.
- If there are many cards, prefer a disciplined grid over full-width rows that become visually noisy.

Acceptance:

- Approved feature anchors remain visible.
- Cards align to a central product story.
- No generic SaaS feature-card sprawl.

### 7. PartnerSection

- Use `max-w-[1040px]` to `max-w-[1120px]`.
- If the section implies partners/customers, check copy carefully to avoid fake proof.
- Consider reframing as “built for project teams” if no real partner proof exists.

Acceptance:

- No fake logos, fake partnerships, or fake trust signals.
- Content feels credible and specific.

### 8. PricingSection

- Use a narrower commercial width: `max-w-[900px]` to `max-w-[960px]`.
- Keep preview/early access posture honest.
- Avoid making the section feel like a finished pricing matrix if pricing is not settled.

Acceptance:

- Pricing/readiness copy is honest.
- The section does not overclaim product maturity.

### 9. FinalCTASection

- Keep full-bleed background.
- Use centered inner content: `max-w-[900px]` for copy or `max-w-[1120px]` if it includes proof cards.
- CTA should be calm and direct.

Acceptance:

- The page ends with a focused action, not a wide empty band.

## Shared layout constants for implementation

Recommended future helper constant if duplication becomes noisy:

```ts
const landingContainer = "container mx-auto px-4 sm:px-6 lg:px-8";
const landingContent = "mx-auto max-w-[1120px]";
```

Only create a shared helper if it genuinely reduces duplication. A few repeated Tailwind strings in section components may be simpler and easier to audit.

## Implementation slices for later

### Slice A — Lock baseline

1. Run `git status --short --branch`.
2. Confirm current dirty worktree and avoid unrelated files.
3. Capture current `/` desktop/mobile screenshots if browser QA will be used.
4. Mark hero as locked in the implementation notes.

### Slice B — Full-width company carousel insertion

1. Use placeholder company/logo data if needed, but mark placeholders explicitly and do not word them as real proof.
2. Confirm real company/logo data is real and permission-safe before using real trust/customer wording.
3. Create the full-width carousel section immediately after the locked hero.
4. Keep the logo track outside any focused middle container.
5. Add reduced-motion behavior for the marquee.
6. Before production social-proof claims, replace placeholders with verified proof or hide/reword the carousel.

### Slice C — Container-only pass

1. Add section-level containers to each below-hero section after the carousel.
2. Keep full-bleed section backgrounds/borders.
3. Avoid copy edits except where line wrapping exposes obvious issues.
4. Do not add animation yet beyond the carousel's simple CSS marquee/reduced-motion fallback.

### Slice D — Responsive polish

1. Check mobile, tablet, desktop widths.
2. Fix any grid overflow introduced by narrower containers.
3. Ensure CTA groups and cards wrap cleanly.
4. Ensure section spacing remains coherent after containment.

### Slice E — Copy and section architecture follow-up

1. Use `06-brand-source-synthesis.md` for brand alignment.
2. Reduce repeated claims only after the container pass makes hierarchy visible.
3. Keep the approved feature anchors intact.

## QA checklist

- [ ] Hero/above-fold visual remains unchanged.
- [ ] Company carousel appears immediately after the hero when placeholder or verified company proof data exists.
- [ ] Company carousel logo track spans the full viewport and is not constrained by the focused middle container.
- [ ] Carousel placeholders, if present, are explicitly marked and do not use real social-proof/customer wording.
- [ ] Carousel uses only real, permission-safe company proof and honest relationship wording before public trust claims are made.
- [ ] Below-carousel sections are centered inside Tailwind container/focused max widths.
- [ ] Full-bleed section backgrounds and borders still span the viewport.
- [ ] No horizontal overflow at mobile/tablet/desktop widths.
- [ ] Product preview remains substantial but not wall-to-wall.
- [ ] Copy-heavy sections use narrower readable line lengths.
- [ ] Approved feature names remain visible.
- [ ] No app/workshop typography or layout rules changed.
- [ ] No package changes are required for the container-only slice.

## Validation commands for later implementation

```bash
git diff --check
bun run validate
bun run build
```

If E2E coverage is added later:

```bash
bun run test:e2e -- landing-page
```

## Definition of done for this layout pass

- The below-hero landing page feels focused in the middle of the viewport.
- The hero remains untouched.
- Section backgrounds retain full-width chapter rhythm.
- Layout changes are isolated to landing files.
- Validation passes or failures are documented as pre-existing/unrelated.
