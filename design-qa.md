# `/new` Landing Page Design QA

## Comparison Setup

- **Source visual truth:** `https://edra.ai/` and `https://attio.com/`, captured at 1440 × 900 in `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/edra-1440x900-settled.png` and `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/attio-1440x900-settled.png`.
- **Combined comparison input:** `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/source-implementation-comparison.png`.
- **Implementation:** `http://localhost:3000/new`.
- **Primary implementation screenshot:** `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-1440x900-hero-final.png`.
- **Additional evidence:** desktop proof states, tablet, mobile, and mobile menu captures in `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/`.
- **Viewports:** 1440 × 900 desktop, 768 × 900 tablet, and 390 × 844 mobile.
- **State:** public route, settled hero scene, scroll-driven proof chapters, Proposal scene state, and open mobile menu.

## Full-View Comparison Evidence

The combined comparison shows the intended synthesis rather than a literal clone: Archestimator inherits Edra's restrained editorial pacing, generous paper-colored canvas, and early abstract visual while using Attio's assertive sans-serif headline, product frame density, and product-led narrative. The orange/graphite palette replaces the references' yellow/green accents without changing their hierarchy.

The implementation keeps the project-specific estimate-to-proposal workflow above the fold, exposes the Three.js estimate artifact in the first viewport, and continues into a scroll-mapped product proof instead of reproducing either source's unrelated content. Desktop, tablet, and mobile captures report zero horizontal overflow.

## Focused Region Comparison Evidence

- **Hero:** `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-1440x900-hero-final.png` confirms the final wide headline, compact navigation, high-contrast orange CTA, workflow trail, and visible Three.js artifact.
- **Connected proof:** `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-1440x900-proof-present-fixed.png` and `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-1440x900-proof-revise.png` confirm readable chapter copy, sticky product evidence, active-slot progression, and restrained orange state treatment.
- **Responsive:** `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-768x900-hero.png`, `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-390x844-hero.png`, and `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-390x844-menu.png` confirm clean tablet/mobile reflow, no overflow, a working menu, and a static mobile proof fallback.

## Required Fidelity Surfaces

### Fonts and Typography

- Uses the existing sans and mono stacks, combining Attio-like display confidence with Edra-like editorial restraint.
- Desktop headline resolves to three lines; tablet and mobile use five balanced lines without clipping.
- Product-proof titles and body copy are separated into distinct hierarchy levels, avoiding oversized paragraph treatment.

### Spacing and Layout Rhythm

- Desktop retains generous negative space and a broad hero stage while keeping the CTA and visual artifact in the first viewport.
- The proof sequence uses one sticky product frame with four readable narrative chapters; tablet/mobile fall back to a complete static sequence.
- Desktop, tablet, and mobile show no horizontal overflow.

### Colors and Visual Tokens

- Paper, graphite, warm gray, and signal orange form the page palette.
- Orange is reserved for actions, progress, source/evidence cues, and changed values.
- Primary CTA text now uses graphite on orange for approximately 4.91:1 contrast; the dark icon orb retains a white arrow.

### Image Quality and Asset Fidelity

- The hero uses the implemented Three.js estimate artifact rather than stock imagery or a decorative placeholder.
- Software-like proof panels use realistic project terminology and are explicitly labeled `Concept illustration`.
- Mobile avoids mounting the WebGL scene and presents the designed static poster instead.

### Copy and Content

- Copy follows the approved estimate → proposal → feedback/decision → revision story from the July 20 landing-page plan.
- Current product terms and decision labels are used; fabricated counts, testimonials, logos, and performance claims are absent.
- The primary CTA remains `Request early access` and resolves to `/contact?intent=access`.

## Comparison History

### Iteration 1 — Proof Hierarchy

- **P1 finding:** product-proof chapter bodies rendered as oversized headings and wrapped to as many as seven lines, overpowering the product frame.
- **Fix:** introduced concise chapter titles and moved explanatory copy into body text with a smaller measure.
- **Post-fix evidence:** `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-1440x900-proof-present-fixed.png`.

### Iteration 2 — CTA Contrast

- **P1 finding:** white CTA text on signal orange measured approximately 3.75:1 and missed normal-text contrast.
- **Fix:** changed CTA labels to graphite on orange while preserving the white arrow inside a graphite icon orb.
- **Post-fix evidence:** `/Users/philiplewis/.codex/visualizations/2026/07/20/019f7f39-c733-7b91-adf0-d4b81239ca41/landing-qa/archestimator-new-1440x900-hero-final.png`; computed text/background contrast is approximately 4.91:1.

## Findings

No actionable P0, P1, or P2 findings remain. The deliberate differences from Edra and Attio are product-specific synthesis choices rather than fidelity misses.

## Primary Interactions Tested

- Desktop scroll advances the proof from Build through Present and Revise states.
- Three.js scene control changes from Estimate to Proposal and updates `aria-pressed`.
- Mobile navigation opens and exposes all four links.
- Mobile renders the static poster and static proof sequence without horizontal overflow.
- Browser console and page-error checks returned no warnings or errors.

## Implementation Checklist

- [x] Match the source references' hierarchy and above-the-fold density.
- [x] Preserve Archestimator's orange/gray identity and approved copy.
- [x] Keep Three.js and scroll effects purposeful, responsive, and reduced-motion aware.
- [x] Verify desktop, tablet, mobile, proof states, menu, CTA contrast, and console output.

## Follow-up Polish

- **P3:** Replace the explicitly labeled concept illustrations with sanctioned current-product captures when stable founder-approved fixtures exist.

## Validation Note

Targeted ESLint passes and the route renders cleanly in the in-app browser. Repository-wide typecheck remains blocked by unrelated pre-existing D1 mock shape errors in `src/lib/auth/better-auth-cloudflare.ts`.

## Final Result

passed
