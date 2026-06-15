# 07 — Implementation Plan (Phased, Task-Level)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public landing page (`/`) per specs 04–06: honest proof, product-proof hero,
owned two-color system, systematized rough-notation voice, robust motion, AA accessibility,
CWV-budgeted performance.

**Architecture:** All changes inside the existing landing slice (`src/app/page.tsx`,
`src/components/landing/*`, `src/lib/landing/*`, `src/app/globals.css`, `public/landing/*`).
No app/workshop surfaces touched. No schema/DB work. A/B + consent infrastructure preserved.

**Tech stack:** Next.js (App Router) + React 19 + Tailwind v4 (`@theme inline` tokens) +
rough-notation 0.5.1 + roughjs 4.6.6 + Lenis + next/font (Inter, Roboto Mono — already loaded).

**Branch:** `feat/landing-authentic-redesign` off `main`. One commit per task. Before any edit to a
shared symbol, run the project's required `gitnexus_impact` check (CLAUDE.md rule) — all components
below are landing-only leaves except `globals.css` tokens (verify no app-surface class collisions).

**Verification harness (used by every phase):** `bun run dev` against
`http://localhost:3000`, viewports 360/768/1024/1440; checks: section visible with JS-reveal
forced off, keyboard pass, reduced-motion pass (OS toggle), Lighthouse perf+a11y.

---

## Phase 0 — Honesty & robustness hotfixes (shippable same-day, before redesign)

### Task 0.1: Remove fake testimonials + empty logo marquee
**Files:** Modify: `src/components/landing/CompanyProofCarouselSection.tsx` (carousel viewport
~lines 112–116, testimonial block ~lines 170–191); Modify: `src/app/globals.css`
(`landing-testimonial-*` keyframes ~lines 201–240, `landing-company-marquee` ~175–199).
- [ ] Delete the testimonial `<figure>` carousel markup and the aria-hidden marquee viewport.
- [ ] Delete now-unused keyframes/classes from globals.css.
- [ ] Verify: no visual hole (section padding closes up); grep `testimonial` under
      `src/components/landing/` returns nothing rendered.
- [ ] Commit: `fix(landing): remove placeholder testimonials and empty logo marquee (claims-safety)`

### Task 0.2: Make reveal animation enhancement-only
**Files:** Modify: `src/components/landing/MotionReveal.tsx`; Modify: `src/app/globals.css`
(`[data-motion-reveal]` styles ~lines 881–889).
- [ ] Change hidden-state from `opacity: 0` to `opacity: 0.96; transform: translateY(8px)` and
      transition 400ms ease-out-quart, so content is always readable pre-trigger.
- [ ] Add a `requestIdleCallback`/timeout fallback (~1200ms) that force-reveals everything if the
      observer never fires.
- [ ] Verify: throttle CPU ×6 + background the tab, scroll: no blank sections; JS disabled: all
      sections visible.
- [ ] Commit: `fix(landing): reveal animations enhance visible-by-default sections`

### Task 0.3: Fix rough.js diagram label wrapping
**Files:** Modify: `src/components/landing/AnimatedProposalRecordSection.tsx` (circle label
rendering); Modify: `AnimatedProposalRecordSection.module.css`.
- [ ] Replace auto-wrapped circle labels with explicit two-line `<tspan>`/flex lines broken at word
      boundaries (`Reusable` / `Components`, `Estimating`), sized to fit at 360px.
- [ ] Verify at 360/768/1440: no mid-word breaks.
- [ ] Commit: `fix(landing): whole-word labels in rough.js flow diagram`

### Task 0.4: CTA honesty pass (copy-only)
**Files:** Modify: `src/components/landing/HeroSection.tsx` (~227–234),
`FinalCTASection.tsx` (~27–32), `LandingHeader.tsx` (CTA label).
- [ ] Hero primary: signed-out `Request beta access`, signed-in `Open the workspace`
      (logic already branches on auth state — relabel only).
- [ ] Final CTA: same pair; header CTA follows the same rule.
- [ ] Keep tracking event names; add `cta_label` param so the experiment data distinguishes copy.
- [ ] Verify: signed-out click lands on `/contact`; signed-in on `/workshop`.
- [ ] Commit: `feat(landing): honest verb+object CTAs per brand voice`

### Task 0.5: Claims-consistency pass on feature cards
**Files:** Modify: `src/components/landing/CompanyProofCarouselSection.tsx` (card 4 copy).
- [ ] Apply 04 §3 reframe for Activity History ("Revision history — in progress…") so cards agree
      with the Planned tabs.
- [ ] Commit: `fix(landing): align feature claims with MVP/planned status`

### Task 0.6: Housekeeping
**Files:** Delete: `public/landing/archestimator-frosted-construction.png` (2.3MB orphan);
Modify: `src/components/landing/index.ts`.
- [ ] Remove 8 unused exports (SolutionSection, EstimatorEngineSection, FeaturesSection,
      PartnerSection, TestimonialSection, FAQSection, ProductPreview, AnnouncementBanner) and their
      files after grep confirms zero imports.
- [ ] Commit: `chore(landing): remove orphan hero PNG and dead section exports`

**Phase 0 exit:** page contains zero fabricated proof; no blank-section failure mode; diagram
labels intact. Lighthouse a11y ≥ current baseline.

---

## Phase 1 — Token foundation & typography

### Task 1.1: Brand + paper + linework tokens
**Files:** Modify: `src/app/globals.css` (`:root` ~line 22 and `@theme inline` ~line 57).
- [ ] Add tokens exactly per 05 §1.1–1.3 (`--brand-clay`, `--brand-clay-deep`, `--brand-petrol`,
      `--brand-petrol-deep`, `--paper-0/1/2`, `--line-1/2`, `--ink-1/2/3`, `--linework-*`).
- [ ] Alias `--brand-orange: var(--brand-clay)` and `--brand-orange-dark: var(--brand-clay-deep)`
      so existing classes keep working during migration.
- [ ] Replace footer constant: `LandingFooter.tsx:10` `footerColor` → `var(--brand-petrol-deep)`;
      `AnimatedProposalRecordSection.tsx:48` `BLUE_GREEN` → linework tokens.
- [ ] Verify: visual diff of current page shows only the subtle hue shifts; contrast spot-checks
      (`--ink-2` on `--paper-1` ≥4.5:1, white on `--brand-clay` ≥4.5:1) — adjust values up if short.
- [ ] Commit: `feat(landing): own-brand color tokens (clay/petrol/paper/linework)`

### Task 1.2: Landing typography = DESIGN.md Inter scale
**Files:** Modify: `src/app/globals.css` (`body:has([data-landing-page-root])` ~line 92);
Modify: `src/app/layout.tsx` (ensure `inter.variable` on `<body>`).
- [ ] Scope landing root to `font-family: var(--font-inter)`; define utility classes
      `.landing-display`, `.landing-headline-lg`, `.landing-h3`, `.landing-body-lg`,
      `.landing-body` per DESIGN.md values with `clamp()` fluid display
      (`clamp(2.5rem, 1.2rem + 4vw, 4rem)`).
- [ ] Add `.landing-num` (Roboto Mono, `font-variant-numeric: tabular-nums`).
- [ ] Apply scale to all landing H1/H2/H3/body (HeroSection, SectionIntro, all sections);
      sentence-case sweep of headings.
- [ ] Verify: no FOUT/CLS (next/font already self-hosts Inter); H1 balances; app/workshop routes
      unaffected (scope is landing root only).
- [ ] Commit: `feat(landing): adopt DESIGN.md Inter landing scale + mono numbers`

**Phase 1 exit:** tokens live, typography per system, page still structurally old but already
on-brand. Visual regression screenshots archived in this folder's `screenshots/`.

---

## Phase 2 — Hero rebuild

### Task 2.1: Build the estimate artifact component
**Files:** Create: `src/components/landing/HeroEstimateArtifact.tsx`; reuse row/tree primitives
from `src/components/landing/ProductPreviewVariants.tsx`.
- [ ] Compose per 06 §1: paper-2 mat, title-block tab "Estimate — Kitchen fit-out — Rev B",
      mini tree, 5–6 mono line items + total row, overlapping library card, rough circle on total
      (rough-notation `circle`, `--brand-clay`), margin note + arrow ("clients see this →").
- [ ] Once-on-load assembly animation (~1.6s, rows sequential, total counts up); pre-rendered
      static under reduced motion; all text real, ≥12px.
- [ ] Verify in isolation at 360/768/1440; AT pass: artifact exposed as `figure` with a one-sentence
      `figcaption` (visually hidden) describing the estimate.
- [ ] Commit: `feat(landing): hero estimate artifact (product-proof visual)`

### Task 2.2: Replace hero right column & fix left-column rhythm
**Files:** Modify: `src/components/landing/HeroSection.tsx` (visual stack lines ~239–328; left
column flex/gap); Delete: `public/landing/hero-slides/*` (9 JPGs) once unused; Modify:
`src/app/globals.css` (Ken Burns keyframes ~281–360, signal-rail + diagram-node styles).
- [ ] Swap slide rotation + Neat canvas + diagram cards + signal rail for `HeroEstimateArtifact`.
- [ ] Left column: continuous block, gaps 12/20/28px; add eyebrow + secondary link
      `See how it works ↓` (#method); apply 04 hero copy.
- [ ] Keep rough-notation underline timing; keep A/B variant wiring (variant B copy set unchanged).
- [ ] Verify: 1280×800 full hero visible; LCP now text/DOM (measure); CLS 0; hero media ≤500KB
      (target: ~0KB images); mobile shows compact artifact under copy.
- [ ] Commit: `feat(landing): product-proof hero, retire 2.8MB slide rotation`

**Phase 2 exit:** hero proves the product; perf budget met; mobile narrative restored.

---

## Phase 3 — Page body restructure

### Task 3.1: Diagram band upgrade ("Quote in the shape of the offer.")
**Files:** Modify: `AnimatedProposalRecordSection.tsx` + module CSS.
- [ ] Add H2 + promote right-column prose per 06 §2; linework palette + single clay emphasis;
      continuous stroke-dashoffset draw 25–35s (static when reduced-motion); visually-hidden
      `<ol>` flow alternative.
- [ ] Commit: `feat(landing): living rough-flow diagram with text alternative`

### Task 3.2: Problem section (new)
**Files:** Create: `src/components/landing/ProblemSection.tsx`; Modify: `src/app/page.tsx`
(insert after diagram band).
- [ ] Implement 06 §3 with 04 §4 copy; rough circle on "feels normal".
- [ ] Commit: `feat(landing): problem section (the old way)`

### Task 3.3: Capability rows (rebuild drench content)
**Files:** Create: `src/components/landing/CapabilityRowsSection.tsx` (subsumes
`SecondaryClaimSection` intro copy + the 4 feature cards' copy); Modify: `src/app/page.tsx`
(replace `CompanyProofCarouselSection` + `SecondaryClaimSection`); Delete:
`CompanyProofCarouselSection.tsx` + `company-proof-data.ts` when empty.
- [ ] Three alternating rows per 06 §4 with distinct proof mockups (reuse/extend
      `ProductPreviewVariants` pieces); icon+text "Planned" tag on revision element; no video
      placeholders.
- [ ] `#method` anchor moves to this section's intro.
- [ ] Commit: `feat(landing): capability proof rows replace drench section`

### Task 3.4: Product showcase → petrol anchor
**Files:** Modify: `src/components/landing/ProductShowcaseSection.tsx`.
- [ ] Background `--brand-petrol`, light text (+0.05 lh), paper-mat panels; retitle per 04 §3;
      badge icon+text; one rough annotation per panel; keep keyboard nav.
- [ ] Extend `LandingHeader` observer to switch header state over this section too.
- [ ] Commit: `feat(landing): petrol anchor product showcase`

### Task 3.5: Honest proof strip (new)
**Files:** Create: `src/components/landing/HonestProofSection.tsx`; Modify: `src/app/page.tsx`.
- [ ] Implement 06 §6 (facts chips + founder line — owner-approved text only). Static, no autoplay.
- [ ] Commit: `feat(landing): honest proof strip`

### Task 3.6: Pricing + FAQ
**Files:** Modify: `src/components/landing/PricingSection.tsx`; Create:
`src/components/landing/BetaFaq.tsx`.
- [ ] Retitle, mono "0" set-piece with rough circle, 4-question accessible FAQ
      (button + `aria-expanded` + region), copy from 04 §4.
- [ ] Commit: `feat(landing): honest pricing band with beta FAQ`

### Task 3.7: Final CTA + footer + nav
**Files:** Modify: `FinalCTASection.tsx`, `LandingFooter.tsx`, `LandingHeader.tsx`,
`CookieConsentBanner.tsx`.
- [ ] Final CTA → clay band per 06 §8 (mirror hero copy/CTA); footer graph accents → linework
      tints; "Cookie settings" moves into footer after first consent (banner chip hidden once
      consent cookie exists); nav anchors per 06 §0.
- [ ] Commit: `feat(landing): clay final CTA, nav anchors, footer cookie settings`

**Phase 3 exit:** target architecture (06 table) live end-to-end.

---

## Phase 4 — Quality gates (run, fix, evidence)

### Task 4.1: Accessibility pass
- [ ] Keyboard end-to-end; focus visible on petrol/clay; FAQ + tabs AT-tested; diagram `<ol>`
      announced; contrast audit of every token pairing (record values in 09 evidence table);
      no `role="img"` on nonexistent media.
### Task 4.2: Performance pass
- [ ] Lighthouse mobile ≥90 perf; LCP ≤2.5s on throttled 4G; total image payload ≤900KB;
      defer rough.js below fold (dynamic import like Neat.js); confirm Inter single-download.
### Task 4.3: Motion & robustness pass
- [ ] Reduced-motion parity on every animated element; JS-off render readable; CPU-throttled
      scroll shows no blank paints; Lenis anchor offsets still correct.
### Task 4.4: Cross-viewport visual QA
- [ ] 360/768/1024/1440/1920 screenshot set archived to `screenshots/` in this plan folder;
      no horizontal overflow; artifact legible at every width.
### Task 4.5: Analytics & SEO wiring
- [ ] Metadata per 04 §6; events per 08 §2 firing (verify in GA4 debug); A/B experiment re-armed
      with new copy variants.
- [ ] Commit per fix: `fix(landing): <gate finding>`

**Phase 4 exit = launch gate:** all checks in `09_READINESS_GATE_AND_SCORECARD.md` green +
owner visual approval.

---

## Sequencing, estimates, dependencies

| Phase | Effort (focused dev-days) | Depends on |
| --- | --- | --- |
| 0 Honesty hotfixes | 0.5–1 | nothing — ship immediately |
| 1 Tokens + type | 1 | 0 |
| 2 Hero | 1.5–2 | 1 |
| 3 Body restructure | 2.5–3 | 1 (3.x tasks parallelizable after 3.3) |
| 4 Gates | 1 | 2+3 |
| **Total** | **6.5–8 days** | |

**Owner decision points (blockers flagged early):**
1. Final brand hex values (Task 1.1) — eyeball approval of clay/petrol shift.
2. Currency in marketing artifacts: ₱ vs neutral (Task 2.1) — see 02 §G4.
3. Founder line text (Task 3.5).
4. Category phrase for eyebrow/SEO (04 §6) — recommended default provided.
5. Proposal-handoff claim strength (04 §3 card 3) after verifying share/export maturity.
