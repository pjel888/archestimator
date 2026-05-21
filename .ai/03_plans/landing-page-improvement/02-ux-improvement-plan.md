# Landing Page UX Improvement Plan

**Date:** 2026-05-21
**Scope:** Public `/` landing page only.

## Design thesis

The landing page should answer one question fast:

> What is the Archestimator way, and why is it faster for construction cost estimators than disconnected spreadsheets and proposal files?

The page should not merely list features. It should prove a method:

1. start from project structure;
2. add reusable cost components;
3. keep assumptions and scope close to cost rows;
4. compare estimates/revisions without scattering files;
5. explain cost differences visually;
6. export proposal-ready Excel/PDF handoff formats.

## Recommended narrative order

### A. Hero / first claim

Keep or adjust only based on Philip's current direction. If Philip says the current hero is acceptable for now, treat it as locked.

Required proof immediately below:

- show the product structure, not decorative marketing art;
- connect the phrase `this way` to the method shown below.

### B. Immediate trust proof: full-width company carousel

Place a companies-who-use-us carousel immediately after the accepted hero.

Requirements:

- full-width/edge-to-edge horizontal scrolling logo rail;
- not inside the focused middle container;
- placeholder company entries are allowed for first layout/motion implementation only if clearly marked in source data;
- real-logo/customer wording requires real companies/users/design partners with permission-safe logos;
- wording must match the actual relationship (`Used by`, `Design partners`, `Early users`, etc.);
- if placeholders are visible, use neutral non-proof wording and replace or hide before making social-proof claims.

Why here: after the hero answers category/promise, early social proof lowers risk before asking the visitor to study product details.

### C. Product method preview

Move the strongest product proof closer to the top and make it credible:

- estimate tree;
- selected area/context;
- estimate rows;
- component picker/library;
- total/revision/proposal signals.

Preferred direction: static, well-designed product preview derived from current app concepts. Avoid visible placeholder labels. If live screenshots are not ready, use intentional branded diagrams/mockups with real labels.

### D. The intuitive estimating claim

Use the approved line:

> The most intuitive way to create construction cost estimates

Then immediately explain why:

- the estimate follows the project structure;
- repeated pricing work becomes reusable components;
- revisions and proposal options stay traceable;
- outputs remain connected to the estimate.

### E. Workflow proof chapters

Instead of many repeated generic cards, use fewer stronger chapters:

1. **Estimate in the shape of the project** — project/tree/area proof.
2. **Reuse the cost logic that repeats** — Component Library proof.
3. **Compare revisions and proposal options** — alternate/revision proof.
4. **Explain and export the result** — visual cost breakdowns + Excel/PDF/proposal-ready outputs.

### F. Honest MVP preview

Keep the MVP preview framing, but avoid pretending pricing/product maturity is finalized.

Good language:

- `MVP preview`
- `Explore the early estimating workspace`
- `Shape the workflow while the core flow is being built`

Avoid:

- fake discounts;
- fake social proof;
- fake enterprise readiness;
- unsupported `best/market-leading` claims.

### G. Final CTA

Return to the method and route users cleanly:

- unauthenticated: demo/login entry;
- authenticated: workspace entry;
- CTA wording should stay consistent enough that users know where they will land.

## Visual direction

- Preserve the warm landing-page art direction unless Philip asks for a full visual reset.
- Replace `PlaceholderMedia` labels with intentional visuals.
- Use product-shaped visuals, not generic SaaS illustration filler.
- Keep landing scale distinct from workshop/app scale; landing may use large editorial typography, but product/workshop surfaces remain compact.
- Prefer fewer, more confident sections over a long page of repeated cards.

## Content guardrails

- Use `construction cost estimators` for the public audience when audience copy is needed.
- Keep feature anchors recognizable: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons, Visual Cost Breakdowns, Proposal-Ready Outputs, Industry Standard Export Formats.
- Do not use fake testimonials/logos/customers as real proof.
- Placeholder company names/logos are acceptable during first carousel implementation only when explicitly marked and neutrally worded.
- If a company carousel uses real social-proof wording, the logos and relationship wording must be real, permission-safe, and non-inflated.
- Do not imply completed exports/pricing beyond MVP-preview status unless the implementation exists and is verified.
- Make assumptions, revisions, exports, and proposal outputs sound editable/traceable, not automated final truth.
- **SEO/Metadata Guardrail:** Ensure page titles and meta descriptions meet recommended lengths (50-60 chars for title, 150-160 for description) and target key estimation terms.
- **No Logo Headings:** Do not use `h1`-`h6` tags for logos in the infinite marquee. Use `span` or `p` tags to prevent heading duplication in search index crawls.
- **Snappier Scroll:** Tune Lenis smooth scrolling (e.g. increase `lerp` to `0.12`) to eliminate perceived weight or scroll lag while settling.

## Success criteria

A first-time visitor should be able to state:

1. Archestimator is for construction cost estimators.
2. The product creates estimates around project structure, not disconnected spreadsheet rows.
3. Reusable cost components reduce repeated work.
4. Revisions/proposal comparisons remain connected to estimate logic.
5. The expected outputs are practical: proposal-ready files plus Excel/PDF handoff.
6. The product is honestly framed as MVP preview, not fake mature SaaS.
7. Search engines index clean, non-repetitive heading hierarchies, and the landing page loads sub-second with no GPU console warnings.
