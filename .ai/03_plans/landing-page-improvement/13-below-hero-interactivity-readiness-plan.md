# Below-Hero Interactivity Readiness Plan

**Date:** 2026-05-21
**Status:** Planning-only; implementation not started.
**Scope:** Public `/` landing page below the locked hero.
**Source:** Kimi read-only frontend design pass, reconciled with live repo state and Archestimator brand constraints.
**Hard boundary:** `HeroSection` headline, copy, CTA, background, and above-fold visual treatment remain locked.

## 1. Current landing diagnosis

### Already working

- `Lenis` is installed and scoped through `LandingSmoothScrollProvider`.
- The company proof carousel renders immediately after the hero as a full-width light rail.
- The carousel is CSS-driven, server-rendered, placeholder-safe, and has no pause/resume button.
- Below-hero sections now use centered `max-w-*` containers instead of uncontrolled wide content.
- `ProductPreview` already reads as a real estimating UI surface: tree, rows, component picker, total badge.

### Still weak

- `ProductShowcaseSection` tabs are visual-only. They look interactive but do not change the product preview.
- There is no scroll-reveal or staged reading rhythm below the carousel.
- `SolutionSection` still uses `PlaceholderMedia`, which can read as unfinished even if the rest of the page is polished.
- Some strong feature language exists in dormant components/files but is not merged into the rendered flow.
- Hover/focus behavior exists but is not yet a consistent landing microinteraction system.

## 2. Recommended direction

Implement a **CSS + IntersectionObserver + functional-tabs** pass.

This is the strongest fit because:

1. It fixes the biggest credibility issue: tabs that currently do nothing.
2. It improves perceived quality without adding a motion package.
3. It keeps the page construction-estimating specific instead of becoming generic animated SaaS.
4. It respects the locked hero and the already-approved light full-width carousel.
5. It uses tools already in the repo: React, Tailwind, browser APIs, Lenis.

## 3. Rejected/deferred directions

### Conservative CSS-only polish

Acceptable if we need a minimal patch, but insufficient because the inactive tabs remain a broken promise.

### GSAP / ScrollTrigger product-story spike

Deferred. It could animate a scroll-scrubbed “estimate builds itself” story, but for this pass it is too much complexity and bundle weight. Functional tabs explain the product faster and give the visitor control.

Create a separate GSAP spike only if a later design explicitly requires timeline/scrub choreography that CSS, stateful tabs, and IntersectionObserver cannot handle.

## 4. Section-by-section interactivity map

### `CompanyProofCarouselSection`

Decision: keep as-is.

- Full-width light rail remains outside the focused container rule.
- CSS marquee remains the only animation.
- Hover/focus-within pause remains.
- Reduced-motion behavior remains static/manual-scroll.
- Do not add a pause/resume button unless Philip asks.
- Do not make placeholder proof sound like real adoption.

### `ProductShowcaseSection`

Decision: primary interaction target.

Required behavior:

- Convert the four visual buttons into a real accessible tablist.
- Tabs:
  - Estimate Workspace
  - Component Library
  - Revision Intelligence
  - Proposal Comparisons
- Each tab renders a credible static panel. No live data fetches.
- Use `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, and stable ids.
- Support `ArrowLeft` / `ArrowRight` keyboard movement.
- Use a subtle fade/slide transition for tab panel changes.
- In `prefers-reduced-motion`, switch panels instantly.

Recommended tab panels:

- **Estimate Workspace:** current `ProductPreview` baseline: hierarchy tree, rows, component picker, total badge.
- **Component Library:** emphasizes reusable cost components, item cards, unit/cost metadata, and insertion into an estimate.
- **Revision Intelligence:** shows a simplified revision diff or changelog overlay: quantity change, rate change, assumption/scope change.
- **Proposal Comparisons:** shows two estimate/proposal totals side-by-side with a clear delta and proposal-readiness note.

Do not touch the `HeroSection` function while editing the file that contains `ProductShowcaseSection`.

### `SecondaryClaimSection`

Decision: add subtle reveal/stagger.

- Wrap section content in `MotionReveal`.
- Reveal order: eyebrow → headline → body → workflow pillars.
- Pillar hover: tiny lift, orange border accent, slightly stronger shadow.
- Add focus-visible treatment if pillars become focusable; otherwise keep them non-interactive static content.

### `SolutionSection`

Decision: replace placeholder and add reveal.

- Remove public `PlaceholderMedia` / `workspace preview placeholder` label.
- Replace with either:
  - a `ProductPreview` variant; or
  - a branded static hierarchy/workflow diagram showing project → estimate → component/revision/proposal logic.
- Stagger intro, visual, and feature cards.
- Tighten feature copy around approved public anchors: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons, Visual Cost Breakdowns, Proposal-Ready Outputs, Industry Standard Export Formats.
- Avoid generic language such as `streamline workflows`, `unlock productivity`, or unsupported enterprise claims.

### `PricingSection`

Decision: polish only.

- Add one reveal wrapper.
- Keep honest MVP-preview posture.
- Add focus-visible ring to CTA if missing.
- No pricing-table expansion unless Philip separately approves pricing strategy.

### `FinalCTASection`

Decision: polish only.

- Add one reveal wrapper.
- Keep CTA calm and direct.
- No pulse, bounce, loop, or spectacle animation.

## 5. Package recommendation

Install nothing.

Current state:

- Smooth scroll: `lenis@^1.3.23` already installed and scoped.
- Product tabs: React state + CSS.
- Reveal: native `IntersectionObserver`.
- Hover/focus: Tailwind utilities.
- Carousel: existing CSS marquee.

Do not add GSAP, Framer Motion, `motion`, anime.js, React Spring, or Lottie for this pass.

## 6. Implementation readiness gate

Before any code implementation, verify:

- [ ] `git status --short --branch` has been checked; unrelated dirty work is noted.
- [ ] `src/app/page.tsx` still renders the expected section order.
- [ ] `HeroSection` is still locked.
- [ ] `ProductShowcaseSection` is confirmed as below-hero scope.
- [ ] No `/workshop` file is in scope.
- [ ] Four tab panel compositions are sketched/decided before code.
- [ ] `SolutionSection` replacement visual is decided before code.
- [ ] `prefers-reduced-motion` behavior is specified for tabs and reveals.
- [ ] The implementation will not install packages.
- [ ] The implementation prompt includes “no fake proof” and “no hero changes.”

Verdict for implementation planning: **CONDITIONAL GO**.

Conditions:

1. Use the two new planning docs as the source of truth for the interaction pass.
2. Start with tests around tabs/reduced-motion if implementation begins.
3. Do not implement GSAP or any package-based animation in this pass.
4. Stop if the implementation requires changing the locked hero to make the design work.

## 7. Files likely touched later

Expected modified files:

- `src/components/landing/HeroSection.tsx` — `ProductShowcaseSection` only.
- `src/components/landing/ProductPreview.tsx` — add variant support or split static variants.
- `src/components/landing/SolutionSection.tsx` — remove placeholder visual and add reveal wrapper.
- `src/components/landing/SecondaryClaimSection.tsx` — add reveal/stagger classes.
- `src/components/landing/PricingSection.tsx` — add reveal/focus polish.
- `src/components/landing/FinalCTASection.tsx` — add reveal/focus polish.
- `src/app/globals.css` — add shared reveal utilities if Tailwind-only classes are not enough.

Expected created files:

- `src/hooks/useMotionReveal.ts` or `src/components/landing/useMotionReveal.ts`.
- `src/components/landing/MotionReveal.tsx`.
- Optional: `src/components/landing/ProductPreviewVariants.tsx` if variants make `ProductPreview.tsx` too large.

Expected test files:

- Add or update `tests/vitest/landing-company-proof.test.ts` only if carousel assertions are affected.
- Add a new landing interactivity test file, e.g. `tests/vitest/landing-interactivity.test.tsx`, for tabs and reveal behavior.

Files that should not be touched:

- `src/components/landing/HeroSection.tsx` `HeroSection` function.
- `/workshop` route files.
- app/workshop shared typography primitives.
- `package.json` / `bun.lock` for new animation packages.

## 8. Proposed implementation task breakdown

### Task 1 — Baseline and tests

Objective: prove the current inactive tabs and placeholder string before changing behavior.

Steps:

1. Read `ProductShowcaseSection`, `ProductPreview`, and `SolutionSection`.
2. Add a failing test that expects clicking `Component Library` to change the rendered panel.
3. Add a failing test that expects `SolutionSection` not to render public `placeholder` text.
4. Run the focused test file and confirm expected failures.

### Task 2 — Product preview variants

Objective: create credible static panel variants without live data or new packages.

Steps:

1. Extract current preview data into a reusable variant map or component split.
2. Add three additional variants: Component Library, Revision Intelligence, Proposal Comparisons.
3. Keep all variant copy construction-estimating specific.
4. Run focused tests.

### Task 3 — Accessible product tabs

Objective: wire the four tabs as real controls.

Steps:

1. Convert visual buttons to a `tablist` with active state.
2. Render matching `tabpanel` content.
3. Add keyboard support.
4. Add reduced-motion-safe panel transition classes.
5. Run tab tests.

### Task 4 — Motion reveal helper

Objective: add one shared reveal mechanism.

Steps:

1. Create `MotionReveal` / `useMotionReveal`.
2. Use one IntersectionObserver per wrapper.
3. Reveal immediately if reduced motion is active.
4. Keep children readable if JS fails.
5. Add a focused test with mocked `IntersectionObserver`.

### Task 5 — Apply reveals and remove placeholder media

Objective: improve below-hero reading rhythm.

Steps:

1. Apply reveal wrapper/stagger classes to `SecondaryClaimSection`.
2. Replace `SolutionSection` media with a credible static visual.
3. Apply reveal wrapper to `PricingSection` and `FinalCTASection`.
4. Add/verify focus-visible classes on interactive elements.
5. Run focused tests.

### Task 6 — Full validation and browser QA

Objective: verify implementation quality with evidence.

Steps:

1. Run `git diff --check`.
2. Run `bun run validate`.
3. Run `bun run build`.
4. Browser-check `/` at mobile and desktop widths.
5. Check reduced-motion behavior.
6. Confirm no `/workshop` files changed.
7. Confirm `HeroSection` function is unchanged.

## 9. Test and browser QA plan

### Unit/DOM tests

Required coverage:

- Product tabs render as `tablist` / `tab` / `tabpanel`.
- Clicking each tab changes panel content.
- Active tab has `aria-selected="true"`.
- ArrowLeft/ArrowRight move between tabs.
- Reduced-motion path does not leave content hidden.
- `SolutionSection` no longer renders `workspace preview placeholder` or public `placeholder` wording.

### Browser QA

Viewport targets:

- 360–390px mobile.
- 414–430px mobile wide.
- 768px tablet.
- 1280–1440px laptop.
- 1728px+ wide desktop.

Checks:

- Hero/above-fold unchanged.
- Company carousel remains full-width light rail.
- Product tabs switch without layout jump or horizontal overflow.
- Focus rings are visible.
- Keyboard tab order is normal.
- Reduced-motion reveals content immediately and does not animate transforms.
- No horizontal page overflow.
- Anchor links still land correctly with sticky header offset.

## 10. Risks

- **Tab variant bloat:** mitigate by splitting `ProductPreviewVariants.tsx` if needed.
- **FOUC/hidden content:** never rely on JS to make essential content visible.
- **Hero accidental edits:** diff `HeroSection` function before completion.
- **Generic SaaS copy drift:** compare final copy to brand docs.
- **Motion overdesign:** if it starts feeling like spectacle, remove motion before adding complexity.
- **Kimi model ambiguity:** local CLI accepted the prompt only through configured default after explicit `--model kimi-k2.6` failed; verify model alias before a Kimi implementation run that must specifically target K2.6.

## 11. Acceptance criteria

A later implementation is ready to ship only if:

- product tabs are functional and accessible;
- no public placeholder media label remains;
- below-hero sections have restrained, reduced-motion-safe reveal/microinteraction polish;
- no new package was installed;
- hero remains unchanged;
- carousel remains full-width/light/no pause button;
- no fake social proof is introduced;
- `git diff --check`, `bun run validate`, and `bun run build` pass;
- browser QA confirms no overflow and acceptable reduced-motion behavior.
