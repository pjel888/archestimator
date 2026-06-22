# Landing Page Best-Practices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the next Archestimator homepage as a restrained, product-proof-led public page for AEC cost intelligence.

**Architecture:** Evolve the active route: `src/app/page.tsx` -> `PublicPageShell` -> `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`. Keep `HeroSignalField.tsx` as the subtle Three.js leaf or replace it with an equally isolated client leaf that preserves the same performance guards. Route detailed pricing to `/pricing`, detailed features to `/features`, and trust/security to `/trust`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4 tokens in `src/app/globals.css`, `next/font` Doto/Geist/Roboto Mono, existing liquid-glass system, optional Three.js client leaf, Bun verification commands.

---

## Evidence Pack To Read First

- `.ai/03_plans/2026-06-22-LandingPage/00-DESIGN-STANDARDS.md`
- `.ai/03_plans/2026-06-22-LandingPage/01-WEB-DESIGN-REFERENCE-STUDY.md`
- `.ai/03_plans/2026-06-22-LandingPage/02-INTERCOM-ULTIMATE-REFERENCE-AND-ASSET-PLAN.md`
- `.ai/03_plans/2026-06-22-LandingPage/03-INTERCOM-SHEPHERD-DIRECTION.md`
- `.ai/03_plans/2026-06-22-LandingPage/04-HERO-THREEJS-BACKGROUND-DIRECTION.md`
- `.ai/03_plans/2026-06-22-LandingPage/05-PRODUCT-TRUTH-FOR-LANDING.md`
- `.ai/03_plans/2026-06-22-LandingPage/06-LANDING-CONTENT-ARCHITECTURE.md`
- `.ai/03_plans/2026-06-22-LandingPage/07-CODEBASE-AI-BUILD-BRIEF.md`
- `.ai/03_plans/2026-06-22-LandingPage/08-COPY-CTA-AND-CONTENT-BEST-PRACTICES.md`
- `.ai/03_plans/2026-06-22-LandingPage/09-PERFORMANCE-ACCESSIBILITY-AND-MOTION-BEST-PRACTICES.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/01-beta-product-thesis-and-prioritization.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/10-access-path-and-persona-taxonomy.md`
- `DESIGN.md`
- `src/app/globals.css`
- `src/app/layout.tsx`

## File Structure

Expected source touch points:

- Modify: `src/app/page.tsx`
  - metadata title/description if the final copy changes.
- Modify: `src/components/landing/gpt-taste/RedesignedLandingPage.tsx`
  - section order, copy, CTAs, product proof, community strip, pricing removal.
- Modify or preserve: `src/components/landing/gpt-taste/HeroSignalField.tsx`
  - keep desktop-only, reduced-motion, low-power WebGL behavior.
- Optional create: `src/components/landing/gpt-taste/ProductProofFrame.tsx`
  - reusable Estimate Sheet / Library / Proposal visual frame.
- Optional create: `src/components/landing/gpt-taste/CommunityStrip.tsx`
  - social/follow links, only when real destinations exist.
- Optional modify: `src/app/globals.css`
  - only if landing needs tokenized support for the workshop-like grid/glass style.
- Tests to run/update only if code changes require them:
  - `tests/vitest/landing-amigo-redesign.test.tsx`
  - `tests/vitest/landing-interactivity.test.tsx`
  - `tests/vitest/public-font-lcp-audit.test.ts`

## Task 1: Preflight Current Route

- [ ] Confirm `src/app/page.tsx` still renders `RedesignedLandingPage`.

Run:

```sh
sed -n '1,80p' src/app/page.tsx
```

Expected: the route imports `PublicPageShell`, imports
`RedesignedLandingPage`, and renders it inside the shell.

- [ ] Confirm the current landing component still contains the sections to evolve.

Run:

```sh
rg -n "Estimates that remember|pricingCells|HeroSignalField|footer|roleSlices|bentoCards" src/components/landing/gpt-taste/RedesignedLandingPage.tsx
```

Expected: matches for hero, proof cards, role slices, pricing, and footer.

## Task 2: Replace The Hero Copy And CTA Contract

- [ ] In `RedesignedLandingPage.tsx`, set the hero H1 to:

```text
Your cost intelligence layer.
```

- [ ] Set hero support copy to:

```text
Build AEC estimates from your own prices and suppliers, keep every revision on the record, and send proposals clients can review and approve.
```

- [ ] Add or preserve a small maturity line near the CTA:

```text
Pre-launch MVP preview for AEC estimating teams.
```

- [ ] Use these CTA labels unless auth state requires `Open workspace`:

```text
Request early access
Book a walkthrough
```

- [ ] Ensure no standalone `Learn more` CTA is introduced.

Verification:

```sh
rg -n "Your cost intelligence layer|Build AEC estimates|Pre-launch MVP preview|Learn more" src/components/landing/gpt-taste/RedesignedLandingPage.tsx
```

Expected: the first three strings are present; `Learn more` is absent unless
qualified by a destination-specific phrase.

## Task 3: Restrain Typography

- [ ] Replace hero and major section heading clamps that reach `5.9rem`, `6rem`, or
  `6.15rem`.

Use this professional range unless the design plan explicitly changes:

```text
Hero H1: text-[clamp(2.625rem,3.6vw,4rem)]
Section H2: text-[clamp(2rem,3vw,3.5rem)]
Product-card title: text-[clamp(1.375rem,2vw,2rem)]
Role title: text-[clamp(1.5rem,2.2vw,2.4rem)]
```

- [ ] Keep letter spacing normal.
- [ ] Use Doto/Roboto Mono only for one accent word, labels, ordinals, totals, or
  status chips.

Verification:

```sh
rg -n "6\\.15rem|6rem|5\\.9rem|5vw|5\\.35vw" src/components/landing/gpt-taste/RedesignedLandingPage.tsx
```

Expected: no matches remain unless a comment cites Philip explicitly approving a
poster/campaign treatment.

## Task 4: Make Product Proof Real

- [ ] Replace the abstract hero proof panel with a product-led frame centered on
  Estimate Sheet evidence.

Required visible pieces:

```text
Estimate tree / Areas
Sheet rows
Quantities and totals
Library/templates side panel
Revision or Activity rail
Proposal/share status
```

- [ ] Use real screenshots if available. If screenshots are not available, build
  faithful app panels using current workshop visual language.
- [ ] Do not use fake client names, fake logos, fake testimonial cards, or fake
  adoption metrics.

Source surfaces to inspect:

```sh
sed -n '1,220p' src/components/workshop/EstimateWorkspaceClient.tsx
sed -n '1,220p' src/components/workshop/EstimateSheetContent.tsx
sed -n '1,220p' src/components/workshop/estimate-sheet/rows/row-table.tsx
```

Expected: the future visual maps to real estimate/workshop concepts, not a
generic dashboard.

## Task 5: Use The Workshop Visual Language

- [ ] Borrow the `/workshop` system: calm gray canvas, tight grid, subtle orange
  bloom, liquid glass, small numeric labels, and controlled empty space.
- [ ] Keep a single continuous glass surface where possible.
- [ ] Do not stack backdrop blurs inside nested children.
- [ ] Use `--brand-orange` for presence and `--brand-orange-dark` for small orange
  text.

Source anchors:

```sh
sed -n '1,220p' src/components/workshop/WorkshopPageShell.tsx
sed -n '1,80p' src/components/workshop/WorkshopGlassBackdrop.tsx
sed -n '148,220p' src/app/globals.css
sed -n '529,590p' src/app/globals.css
sed -n '1538,1608p' src/app/globals.css
```

Expected: landing visuals feel related to `/workshop`, not a separate template.

## Task 6: Keep Pricing Separate

- [ ] Remove detailed pricing blocks or pricing cards from the homepage.
- [ ] Keep one compact route to `/pricing`.
- [ ] Replace homepage pricing copy with a short evaluation line, such as:

```text
Pricing belongs on its own page while beta packaging is still being validated.
```

or omit pricing copy entirely and use a simple footer/nav link.

Verification:

```sh
rg -n "pricingCells|Solo estimate|Shared proposal|Firm memory|See pricing" src/components/landing/gpt-taste/RedesignedLandingPage.tsx
```

Expected: `pricingCells`, `Solo estimate`, `Shared proposal`, and `Firm memory`
are gone. `See pricing` may remain only as a compact link to `/pricing`.

## Task 7: Add Community / Follow-Along

- [ ] Add a compact community/follow area near the footer or final CTA.
- [ ] Use only real links. If a channel has no maintained destination, omit it.
- [ ] Preferred channel order:

```text
LinkedIn
Instagram
WhatsApp
Facebook
Email/newsletter
```

- [ ] Suggested section copy:

```text
Follow the build.
Get launch notes, product updates, and early workflow examples as Archestimator moves through closed beta.
```

- [ ] Use icon+label links. Do not use placeholder hrefs.

Verification:

```sh
rg -n "Follow the build|Instagram|WhatsApp|Facebook|LinkedIn|newsletter" src/components/landing/gpt-taste/RedesignedLandingPage.tsx
```

Expected: real channel labels are present only when their links are real.

## Task 8: Preserve Three.js Performance

- [ ] Keep `HeroSignalField` desktop-only or lazy after first paint.
- [ ] Preserve WebGL support checks.
- [ ] Preserve `prefers-reduced-motion` static rendering.
- [ ] Preserve `powerPreference: "low-power"` and capped pixel ratio.
- [ ] Ensure the Three.js field is decorative and not required for content
  comprehension.

Verification:

```sh
rg -n "max-width: 1023px|prefers-reduced-motion|low-power|setPixelRatio|dispose|requestAnimationFrame" src/components/landing/gpt-taste/HeroSignalField.tsx
```

Expected: all guard patterns remain or are replaced by equivalent behavior in the
new client leaf.

## Task 9: Run Targeted Verification

- [ ] Run TypeScript:

```sh
bun run type-check
```

Expected: command exits 0.

- [ ] Run targeted landing DOM tests when the edited areas are covered:

```sh
bun run test:dom -- tests/vitest/landing-amigo-redesign.test.tsx tests/vitest/landing-interactivity.test.tsx tests/vitest/public-font-lcp-audit.test.ts
```

Expected: command exits 0, or the future AI records which tests are stale and why.

- [ ] Run build if route composition, Three.js loading, large assets, or font
  loading changed:

```sh
bun run build
```

Expected: command exits 0 and no landing route size regression is ignored.

- [ ] Run diff whitespace check:

```sh
git diff --check -- src/app/page.tsx src/components/landing src/app/globals.css
```

Expected: no trailing whitespace or conflict markers.

## Acceptance Criteria

- [ ] First viewport says AEC or AEC estimating teams.
- [ ] Hero explains cost intelligence in plain language.
- [ ] Hero includes product proof, not just abstract texture.
- [ ] The page uses moderate typography, not giant poster type.
- [ ] Visual language borrows `/workshop`: gray canvas, grid, liquid glass, orange
  precision accents, controlled empty space.
- [ ] Estimate Sheet, Library/Templates, Activity/Revision, and Shared Proposal are
  visible or clearly previewed.
- [ ] Pricing depth is off the homepage and routed to `/pricing`.
- [ ] Community/social follow area is present when real links exist, or explicitly
  omitted because no live channels exist.
- [ ] Three.js is subtle, decorative, low-power, reduced-motion safe, and not
  required for LCP content.
- [ ] No fake proof, fake metrics, fake logos, generic construction cliches, or
  contractor-first framing.
- [ ] Verification commands were run or the validation gap is stated.

## ADR

Decision: evolve the active GPT Taste landing route into a restrained
product-proof homepage instead of creating a parallel landing implementation.

Drivers:

- The active route already contains the shell, nav, glass, hero, bento, proof,
  role, and footer skeleton.
- Philip wants Intercom/Shepherd/interfere-quality flow while preserving the
  app's own `/workshop` design language.
- The product has finance implications, so product proof and copy restraint
  matter more than oversized visual drama.
- Pricing is still validation-sensitive and belongs on a separate page.

Alternatives considered:

- Rebuild from a template: rejected because it would drift from `/workshop` and
  the live Archestimator product language.
- Keep the current giant headline scale: rejected because the user explicitly
  dislikes large fonts and the product needs professional restraint.
- Make the homepage a full product manual: rejected because the homepage should
  be a polished sneak peek, with detail pages carrying deeper evaluation.

Consequences:

- Future implementation should spend more effort on product screenshots/panels
  and less effort on decorative hero typography.
- The landing route stays easier to verify because the component boundary remains
  known.
- Some deeper claims must move to `/features`, `/trust`, and `/pricing`.

Follow-ups:

- Capture or generate clean product screenshots of Estimate Sheet, Library,
  Proposal Review, and Workshop Dashboard.
- Confirm real Instagram, WhatsApp, Facebook, LinkedIn, and newsletter URLs before
  adding social links.
- Decide whether the mixed-font hero accent uses Doto or Roboto Mono after the
  final hero copy is selected.
