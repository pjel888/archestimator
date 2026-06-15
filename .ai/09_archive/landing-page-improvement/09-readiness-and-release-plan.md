# Landing Page Readiness and Release Plan

**Date:** 2026-05-21
**Status:** Planning only; no code implementation yet.
**Scope:** Public `/` landing page below the accepted hero.
**Current pass priority:** Add a placeholder-safe full-width company carousel immediately after the locked hero, add a landing-only Lenis smooth-scroll enhancement if implementation is approved, then center/focus the remaining below-carousel content with Tailwind containers.

## Readiness principles

1. Hero is locked for the current pass.
2. Brand folder is the source of truth for landing copy and narrative.
3. A full-width company carousel may sit immediately after the hero. Placeholder company entries are acceptable for first implementation scaffolding, but production trust claims require real, permission-safe company proof.
4. Other full-bleed sections may remain, but content should be centered and contained.
5. Motion is progressive enhancement, not required for comprehension.
6. Lenis may be tried as a landing-only smooth-scroll enhancement; it must not affect `/workshop`.
7. No fake proof.
8. Landing changes must not bleed into authenticated `/workshop` UI density rules.
9. Existing dirty worktree must be respected before implementation.

## Pre-implementation readiness gate

Before any code changes:

- [ ] Run `git status --short --branch`.
- [ ] Identify unrelated dirty files and avoid overwriting them.
- [ ] Confirm the implementation branch/worktree strategy.
- [ ] Re-read `src/app/page.tsx` and `src/components/landing/*` if source changed after this plan.
- [ ] Confirm `HeroSection` remains out of scope.
- [ ] Confirm placeholder company data is explicitly marked if real proof is not ready; confirm real-logo/customer claims wait until proof is real, permission-safe, and accurately worded.
- [ ] Confirm `ProductShowcaseSection` is below-hero scope even though it lives in `HeroSection.tsx`.
- [ ] Re-check `package.json` before deciding on any animation library.
- [ ] If Lenis is approved, install with `bun add lenis` and keep activation scoped to the landing page.
- [ ] Confirm no `tailwind.config.*` exists and Tailwind v4 remains CSS-configured.
- [ ] Capture current desktop/mobile `/` screenshots if visual QA evidence is needed.

## Plan readiness gate

This plan pack is ready for implementation when these docs exist and are current:

- [ ] `01-current-inventory.md`
- [ ] `02-ux-improvement-plan.md`
- [ ] `03-implementation-plan.md`
- [ ] `04-readiness-gate.md`
- [ ] `05-archived-plan-delta.md`
- [ ] `06-brand-source-synthesis.md`
- [ ] `07-below-hero-container-layout-plan.md`
- [ ] `08-motion-and-microinteraction-plan.md`
- [ ] `09-readiness-and-release-plan.md`
- [ ] `10-conversion-flow-and-company-carousel-research.md`
- [ ] `11-lenis-smooth-scroll-and-placeholder-company-proof-plan.md`

## Implementation sequence when approved

### Phase 1 — Full-width company carousel

Objective: add the companies-who-use-us proof strip immediately after the locked hero without constraining it to the focused middle container. Placeholders are allowed for first layout/motion implementation if explicitly marked and neutrally worded.

Expected work:

- Use placeholder company data first if needed, but mark placeholders explicitly.
- Confirm companies/logos are real and permission-safe before using real trust/customer wording.
- Place the carousel immediately after `HeroSection`.
- Make the logo track span/scroll across the full viewport.
- Use CSS marquee behavior with reduced-motion fallback.
- Do not render placeholders as real proof.

Exit criteria:

- Hero unchanged.
- Carousel immediately follows hero.
- Logo track is full-width, not inside a centered max-width wrapper.
- No fake or mismatched company proof.
- Placeholder state is explicitly marked and not worded as real customer/social proof.
- No package changes.

### Phase 2 — Landing-only Lenis smooth-scroll enhancement

Objective: add Lenis as a progressive enhancement for the public landing page, not for app/workshop routes.

Expected work:

- Install with `bun add lenis` only when implementation is approved.
- Add a landing-only `LandingSmoothScrollProvider` using `ReactLenis` from `lenis/react`.
- Import `lenis/dist/lenis.css` in the safest Next-supported location if needed.
- Disable Lenis for `prefers-reduced-motion: reduce`.
- Keep the logo carousel CSS-driven.
- Check anchor-link offsets and sticky header behavior.

Exit criteria:

- Smooth scroll affects `/` only.
- Reduced-motion users receive native scrolling.
- `/workshop` scroll behavior is unchanged.
- No hydration/runtime errors.

### Phase 3 — Container-only layout correction

Objective: focus the remaining below-carousel content in the middle without changing the hero or adding motion.

Expected work:

- Add centered container wrappers per below-carousel section.
- Preserve full-bleed section backgrounds and borders.
- Use section-specific max widths.
- Fix any responsive overflow caused by narrower wrappers.
- Avoid copy rewrites except obvious line-length fixes.

Exit criteria:

- Hero unchanged.
- Below-carousel content visibly centered/focused.
- No package changes.
- No horizontal overflow.

### Phase 4 — Brand/copy alignment pass

Objective: make the now-contained content read as one Archestimator story.

Expected work:

- Use approved feature anchors.
- Reduce duplicated claims between sections.
- Keep construction estimating language concrete.
- Preserve honest MVP/preview posture.
- Remove or reframe public placeholder labels if present.

Exit criteria:

- Visitor can understand the method without internal docs.
- No fake logos/testimonials/metrics.
- No unsupported pricing or production-maturity claim.

### Phase 5 — Microinteraction pass

Objective: add restrained tactile polish only after layout and content structure are stable.

Expected work:

- Add CSS/Tailwind hover/focus/active states where needed.
- Add small IntersectionObserver reveal helper only if it improves scanning.
- Respect reduced-motion behavior.
- Do not install GSAP unless a separate spike proves it is needed.

Exit criteria:

- Motion supports clarity.
- Content works without JS animation.
- Reduced-motion users see content immediately.

### Phase 6 — Optional GSAP spike

Only if Philip still wants a more choreographed landing experience after Phase 1–5.

Spike output must include:

- proposed timeline section;
- exact reason CSS/IntersectionObserver is insufficient;
- dependency/bundle impact;
- reduced-motion fallback;
- no-JS fallback;
- approval decision before installing.

## Visual QA matrix

Check `/` at minimum:

- Mobile narrow: 360–390px
- Mobile wide: 414–430px
- Tablet: 768px
- Laptop: 1280–1440px
- Desktop wide: 1728px or larger

For each viewport:

- [ ] No horizontal overflow.
- [ ] Hero still matches the accepted baseline.
- [ ] Company carousel appears immediately after the hero when placeholder or verified proof data exists.
- [ ] Carousel spans/scrolls across the full viewport without causing page overflow.
- [ ] Below-carousel content sits in a focused center column.
- [ ] Section backgrounds remain full-bleed.
- [ ] Product preview remains readable.
- [ ] Feature cards do not feel edge-stretched.
- [ ] CTA groups wrap cleanly.
- [ ] Nav anchors still land on meaningful sections.

## Accessibility QA

- [ ] Keyboard focus is visible on CTAs and interactive cards/buttons.
- [ ] Hover-only states have focus-visible equivalents.
- [ ] No animation is required to read content.
- [ ] Logo-carousel marquee stops or becomes static/scrollable under reduced-motion.
- [ ] Reduced-motion mode disables non-essential transforms/reveals and Lenis smooth scrolling.
- [ ] Lenis, if implemented, does not disrupt keyboard focus order or anchor navigation.
- [ ] Any future tabs/buttons have proper semantics.
- [ ] Color contrast remains adequate after any background/container changes.

## Content QA

- [ ] Approved feature names remain present.
- [ ] Audience language is construction-estimating specific.
- [ ] No generic SaaS filler dominates.
- [ ] No fake proof appears.
- [ ] Placeholder company entries, if present, are explicitly marked in source and do not use real customer/social-proof wording.
- [ ] Company-carousel proof uses only real companies/logos and honest relationship wording before public trust claims are used.
- [ ] No visible `placeholder` labels in public-facing rendered content.
- [ ] CTA destinations are consistent and intentional.
- [ ] Preview/early-access posture remains honest.

## Technical validation gate

Docs-only planning changes:

```bash
git diff --check
```

Implementation changes:

```bash
git diff --check
bun run validate
bun run build
```

If landing E2E is added:

```bash
bun run test:e2e -- landing-page
```

## Evidence required in completion report

When implementation eventually happens, the completion report must include:

1. changed files;
2. confirmation that hero/above-fold was not changed;
3. section order after implementation;
4. container strategy used and the company-carousel full-width exception;
5. package changes, including Lenis version if installed, or confirmation that no package was added;
6. validation commands and results;
7. desktop/mobile QA notes;
8. remaining risks or deferred items.

## Stop conditions during implementation

Stop and reassess if:

- company proof is unavailable or unclear but a logo carousel is requested as real social proof;
- placeholder wording begins to read like verified customer proof;
- Lenis changes `/workshop` or dense app-surface scroll behavior;
- touching hero becomes necessary;
- container changes create major product-preview overflow;
- a package install becomes tempting before the layout pass is done;
- the design starts implying fake proof;
- app/workshop UI rules need to change to support landing work.

## Definition of done for this planning request

- Brand folder has been read and translated into landing constraints.
- A below-hero Tailwind container plan exists.
- A motion/microinteraction plan exists with Lenis criteria and GSAP fallback criteria.
- A readiness/release plan exists.
- No source implementation was performed.
