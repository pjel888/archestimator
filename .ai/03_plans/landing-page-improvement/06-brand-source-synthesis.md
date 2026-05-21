# Landing Page Brand Source Synthesis

**Date:** 2026-05-21
**Status:** Planning evidence; no implementation.
**Scope:** Public `/` landing page, below the accepted hero.
**Hard boundary:** Do not touch the above-the-fold hero for the current pass.

## Purpose

This document translates the brand folder into concrete planning constraints for the next landing-page improvement pass. The goal is not to invent a new brand direction; it is to use the existing Archestimator brand materials as the source of truth for the content below the hero.

## Brand sources read

Canonical brand folder:

- `.ai/06_specs/brand/README.md`
- `.ai/06_specs/brand/brand-foundation.md`
- `.ai/06_specs/brand/brand-narrative.md`
- `.ai/06_specs/brand/brand-voice.md`
- `.ai/06_specs/brand/clarity-and-mess-narrative.md`
- `.ai/06_specs/brand/hero-message-thesis.md`
- `.ai/06_specs/brand/spatial-hierarchy-narrative.md`
- `.ai/06_specs/brand/the-archestimator-way.md`
- `.ai/06_specs/brand/landing-brand-narrative-map.md`
- `.ai/06_specs/brand/benefits-and-value-props.md`
- `.ai/06_specs/brand/public-facing-feature-copy.md`
- `.ai/06_specs/brand/marketable-benefit-copy.md`
- `.ai/06_specs/brand/combined-benefit-title-system.md`

Supporting repo sources:

- `src/app/page.tsx`
- `src/components/landing/*`
- `DESIGN.md`
- `src/app/globals.css`
- `package.json`
- `.ai/10_state/decisions.md`

## Brand translation for below-hero planning

### 1. The page should prove clarity, not just claim speed

The brand repeatedly frames the problem as scattered estimating work becoming structured, traceable, and explainable. The below-hero content should therefore show:

- project-shaped estimate hierarchy;
- reusable cost components;
- revisions that stay traceable;
- comparisons that make options easier to explain;
- outputs that are ready to hand off.

Do not make the page feel like a generic SaaS productivity site. The proof needs to look like construction cost estimating.

### 2. Spatial hierarchy is a brand idea, not just layout decoration

The container/focused-middle request supports the brand. If the page stretches too wide, the visitor experiences visual sprawl, which contradicts the clarity narrative.

Below-hero layout should feel like:

- information gathered into a focused working area;
- sections with clear hierarchy and breathing room;
- diagrams/cards that imply order, not noise;
- full-bleed backgrounds only as chapter separators, not as uncontrolled content width.

### 3. The public feature names are the naming spine

Use these feature anchors exactly or very close to exactly:

1. Estimate Workspace
2. Component Library
3. Revision Intelligence
4. Proposal Comparisons
5. Visual Cost Breakdowns
6. Proposal-Ready Outputs
7. Industry Standard Export Formats

Do not rename the system casually per section. Repeated alternate labels make the product feel less real.

### 4. Keep the MVP/preview posture honest

The brand allows confident positioning, but not fake proof. The landing page should avoid:

- fake logos;
- fake testimonials;
- fake usage metrics;
- implied production maturity beyond the current product state;
- pricing claims that are not settled;
- screenshots that imply unsupported product behavior.

If a visual is illustrative, frame it as a product method preview, not as false live evidence.

### 5. Voice should be direct, concrete, and estimator-aware

Prefer wording that a contractor, estimator, architect, QS, engineer, or PM would recognize:

- estimates;
- quantities;
- unit costs;
- line items;
- revisions;
- options;
- proposals;
- PDF/Excel handoff;
- project scope.

Avoid vague SaaS filler:

- all-in-one platform;
- supercharge;
- unlock productivity;
- seamless workflows;
- game changer;
- AI-powered unless a specific AI behavior is actually implemented and approved for public copy.

## Current below-hero story baseline

The current route renders these sections after the accepted hero:

1. `ProductShowcaseSection` from `src/components/landing/HeroSection.tsx`
2. `SecondaryClaimSection`
3. `SolutionSection`
4. `EstimatorEngineSection`
5. `FeaturesSection`
6. `PartnerSection`
7. `PricingSection`
8. `FinalCTASection`

The current pass does not need to reorder everything immediately. First priority is focused containment and hierarchy below the hero. Reordering/consolidation can follow after visual focus is established.

## Recommended below-hero narrative job

After the hero, the page should answer these visitor questions in order:

1. What does the product feel like when used?
   - Product preview / workspace method.

2. Why is this easier than disconnected spreadsheets?
   - Clarity-from-mess claim supported by concrete workflow.

3. What are the core capabilities?
   - Approved feature anchors, grouped by estimating workflow.

4. What can I hand off?
   - Proposal-ready outputs, PDF/Excel, visual breakdowns.

5. What is the current readiness posture?
   - Honest preview/early access framing.

6. What should I do next?
   - Calm CTA into login/workshop or waitlist/contact, depending on current route intent.

## Container implication from brand

The focused-middle container is not just a technical refactor. It is a brand correction:

- Full-bleed section backgrounds can stay.
- Content should sit inside a consistent centered working width.
- Wide card grids should not stretch into empty edge space.
- Product preview should remain substantial, but not become a wall-to-wall mock app.
- Dense copy sections should use narrower reading widths than product visuals.

Recommended wrapper pattern is documented in `07-below-hero-container-layout-plan.md`.

## Motion implication from brand

Motion should express scattered → structured and hidden → visible. It should not feel like entertainment.

Good motion language:

- gentle section reveal;
- subtle staggered cards;
- row/total emphasis in product preview;
- focused hover/focus states;
- simple progression line from estimate → revision → proposal/export.

Bad motion language:

- parallax for its own sake;
- bouncing CTAs;
- infinite loops;
- heavy scroll-scrub storytelling before the content architecture is stable;
- animations that hide content if JavaScript fails.

Motion planning is documented in `08-motion-and-microinteraction-plan.md`.

## Acceptance criteria for brand alignment

- The accepted hero remains unchanged.
- The below-hero content is visually centered and easier to scan.
- The copy uses construction-estimating language, not generic SaaS language.
- Approved feature names remain visible and consistent.
- The page does not add fake proof.
- Full-bleed backgrounds remain possible without full-bleed content sprawl.
- Motion, if implemented later, reinforces clarity and structure rather than spectacle.
