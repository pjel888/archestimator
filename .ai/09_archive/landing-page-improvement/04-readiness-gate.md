# Landing Page Readiness Gate

**Date:** 2026-05-21
**Scope:** Public `/` landing page.

## Pre-implementation gate

Before implementing the landing-page pass, confirm:

- [ ] Current branch and dirty worktree have been checked with `git status --short --branch`.
- [ ] Existing uncommitted changes are not overwritten.
- [ ] `.ai/03_plans/landing-page-improvement/01-current-inventory.md` still matches live `src/app/page.tsx` and `src/components/landing/*`.
- [ ] Hero/above-fold is locked for the current pass; do not edit `HeroSection` copy or visual treatment.
- [ ] Company/logo proof placeholders are explicitly marked if real proof is not ready; real-logo/customer claims wait until data is confirmed real, permission-safe, and accurately worded before launch.
- [ ] If `src/components/landing/HeroSection.tsx` is touched, the change is limited to `ProductShowcaseSection`.
- [ ] No archived Intercom/v4 app-shell slice is being treated as active.
- [ ] Landing changes are isolated from `/workshop` implementation unless a static product preview needs current product references.
- [ ] `.ai/03_plans/landing-page-improvement/12-kimi-k2-6-landing-page-prompting-and-delegation-plan.md` has been read before delegating to Kimi.
- [ ] `.ai/03_plans/landing-page-improvement/13-below-hero-interactivity-readiness-plan.md` has been read before implementing tabs/reveals/microinteractions.

## Content gate

The landing page must pass these checks:

- [ ] Uses `construction cost estimators` or equally concrete audience language where needed.
- [ ] Preserves approved feature anchors: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons, Visual Cost Breakdowns, Proposal-Ready Outputs, Industry Standard Export Formats.
- [ ] Does not render fake logos, fake testimonials, fake customers, fake usage metrics, or fake pricing claims as real proof.
- [ ] Placeholder company entries, if used, are marked in source data and worded neutrally in public UI.
- [ ] Company carousel wording matches the real relationship (`customer`, `pilot user`, `design partner`, etc.) before real proof claims are used; no inflated `trusted by` claim.
- [ ] Keeps MVP-preview status honest.
- [ ] Does not include visible `placeholder` labels in public-facing content.
- [ ] Explains why the workflow is faster, not only that the product is smarter.

## UX gate

The landing page must pass these checks:

- [ ] Section order tells a clear story from claim → early trust proof → product method → workflow proof → outputs → CTA.
- [ ] Company carousel appears immediately after the locked hero and spans/scrolls across the full page, not inside the focused middle container.
- [ ] Each below-carousel section keeps full-bleed background/border rhythm while placing content inside a centered Tailwind container/focused max width.
- [ ] Header navigation anchors match actual section content.
- [ ] Product preview/visuals show estimating logic rather than generic decoration.
- [ ] CTAs route cleanly for logged-out and logged-in cases where applicable.
- [ ] Desktop and mobile layouts have no accidental horizontal overflow.
- [ ] Landing-page typography does not mutate app/workshop typography rules.

## Motion/interactivity gate

If microinteractions are added in a later pass:

- [ ] CSS/Tailwind transitions and a tiny IntersectionObserver helper are considered before adding a package.
- [ ] `ProductShowcaseSection` tabs are either made functional/accessibly tabbed or intentionally demoted to non-button static labels; do not leave visual-only inactive tabs.
- [ ] Four tab panel compositions are credible static estimating previews before code begins: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons.
- [ ] Logo-carousel marquee uses CSS first; GSAP is not installed for basic horizontal logo scrolling.
- [ ] No new animation package is installed for the current pass; GSAP requires a separate spike plan and explicit approval.
- [ ] Kimi output is treated as planning/review input until Hermes verifies code, tests, diff, and browser behavior independently.
- [ ] Motion is progressive enhancement; content remains visible without JavaScript animation.
- [ ] `prefers-reduced-motion` behavior is implemented before release.
- [ ] Lenis, if added, is mounted only on the public landing page and disabled for reduced-motion users.
- [ ] Lenis does not drive the horizontal company carousel; the carousel remains CSS-driven.
- [ ] Lenis does not change `/workshop` or dense app-surface scroll behavior.
- [ ] Anchor links still land accurately with sticky header spacing.
- [ ] Hover states have `focus-visible` equivalents.

## Validation gate

Required for docs-only planning changes:

```bash
git diff --check
```

Required for implementation changes:

```bash
bun run validate
bun run build
git diff --check
```

Recommended if E2E coverage is added:

```bash
bun run test:e2e
```

## Completion evidence

A completion report must include:

1. changed files;
2. section order after the change;
3. screenshots or browser-check notes for desktop and mobile;
4. validation commands and results;
5. remaining risks or intentionally deferred landing-page items.
