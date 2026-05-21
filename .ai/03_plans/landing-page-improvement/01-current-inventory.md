# Landing Page Current Inventory

**Date:** 2026-05-21
**Evidence:** `src/app/page.tsx` and `src/components/landing/*` inspected from live repo source.

## Route composition

`src/app/page.tsx` currently renders:

1. `LandingHeader`
2. `HeroSection`
3. `ProductShowcaseSection`
4. `SecondaryClaimSection`
5. `SolutionSection`
6. `EstimatorEngineSection`
7. `FeaturesSection`
8. `PartnerSection`
9. `PricingSection`
10. `FinalCTASection`

## Current sections

### 1. `LandingHeader`

**Purpose:** Public nav and auth-aware entry to demo/workspace.

**Current notes:**

- Navigation labels: Platform, Solutions, Pricing, Resources, Company.
- Some labels point to sections whose content does not exactly match the label yet, especially `Resources` → `#about` and `Company` → `#contact`.
- CTA changes depending on auth state: unauthenticated users see `Get demo` / `Log In`; authenticated users see `Workspace`.

### 2. `HeroSection`

**Purpose:** Primary claim and first CTA.

**Current claim:** `Only the smart ones create cost estimates this way.`

**Current support:**

- Audience eyebrow: `Built for construction cost estimators`.
- CTA: `See the workspace`.
- Supporting promise: `Create in hours, not days. Revisions won't eat your weekends anymore.`
- Trust badges: Component Library, BOQ ready, Revision ready.
- Uses `NeatWireframeBackground` over an orange visual field.

**Risk/opportunity:** Strong thesis, but the rest of the page must immediately define and prove `this way`. If Philip locks the hero, leave it untouched and focus below the hero.

### 3. `ProductShowcaseSection`

**Purpose:** Show the product method immediately after the hero.

**Current content:**

- Tabs: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons.
- Renders `ProductPreview`, a static mockup with estimate tree, estimate rows, total, and component picker.

**Risk/opportunity:** This is the strongest proof surface. It should become more credible by matching current product concepts and avoiding anything that looks like a generic decorative placeholder.

### 4. `SecondaryClaimSection`

**Purpose:** Translate the hero into the below-hero claim and workflow pillars.

**Current claim:** `The most intuitive way to create construction cost estimates`.

**Current pillars:** Project-Shaped Estimates, Component Library, Traceable Revisions, Proposal Comparisons, Visual Cost Breakdowns, Proposal-Ready Outputs, Industry Standard Export Formats.

**Risk/opportunity:** Good approved anchors. Needs enough nearby proof so `most intuitive` reads as a positioning thesis, not an unsupported market claim.

### 5. `SolutionSection`

**Purpose:** Explain the connected estimating flow.

**Current content:**

- Section title: `The smarter way is not one feature. It is the whole estimating flow.`
- Feature cards for Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons, and Industry Standard Export Formats.
- Multiple `PlaceholderMedia` blocks with labels such as `workspace image placeholder` and `feature image 1`.

**Risk/opportunity:** Good conceptual structure, but placeholder media labels are a credibility problem for a public landing page. Replace with real product visuals, purposeful diagrams, or intentionally branded MVP preview panels.

### 6. `EstimatorEngineSection`

**Purpose:** Summarize build/revise/compare/export/explain in one flow.

**Current content:**

- Headline: `Build, revise, compare, export, and explain estimates in one flow`.
- CTA: `See the workspace`.
- Placeholder media: `hero product image placeholder`.

**Risk/opportunity:** Potentially redundant with `SolutionSection` and `FeaturesSection`. Either make this a clear transition/product proof section or remove/merge it.

### 7. `FeaturesSection`

**Purpose:** Feature-by-feature proof.

**Current content:**

- Feature blocks: Project-Shaped Estimates, Component Library, Traceable Revisions, Proposal Comparisons, Industry Standard Export Formats.
- Each block has supporting cards and a `PlaceholderMedia` visual.

**Risk/opportunity:** Copy is stronger than the visuals. The section may feel long because it repeats ideas already introduced in `SolutionSection`. Improve hierarchy, visual proof, and section rhythm.

### 8. `PartnerSection`

**Purpose:** Explain team benefits.

**Current content:**

- Title: `What this changes for the estimating team`.
- Cards: Faster setup, Safer revisions, Clearer client decisions, Cleaner handoff.
- Each card includes `support image` placeholder media.

**Risk/opportunity:** This can become a practical outcomes section, but the name `PartnerSection` is not public-facing and the visual placeholders weaken trust.

### 9. `PricingSection`

**Purpose:** Honest MVP preview access.

**Current content:**

- `MVP preview access`.
- `₱0 MVP preview`.
- CTA: `See the workspace`.
- Placeholder media: `pricing image placeholder`.

**Risk/opportunity:** Honest MVP framing is good. Pricing must stay truthful and should avoid looking like a mature billing page before pricing is decided.

### 10. `FinalCTASection`

**Purpose:** Close with workspace entry.

**Current content:**

- `Build your next estimate the smart way.`
- CTA: `Open workspace`.

**Risk/opportunity:** Clear close. Ensure it uses the same conversion logic as earlier CTAs and does not conflict with auth state.

## Immediate issues to solve

1. Placeholder media labels are visible and too numerous for a polished public page.
2. Several sections repeat the same feature anchors without a clearly escalating story.
3. Navigation labels do not fully map to current section purposes.
4. The page needs rendered/browser verification, not only source-level edits.
5. CTA routing and auth-aware behavior should be checked after any content restructuring.
