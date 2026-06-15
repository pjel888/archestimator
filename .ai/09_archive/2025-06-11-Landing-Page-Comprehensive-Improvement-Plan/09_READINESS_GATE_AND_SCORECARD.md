# 09 — Readiness Gate & Scorecard

Status: gate definition complete. Implementation must not be declared done until every gate row is
green with recorded evidence. (House rule: evidence before assertions.)

## A. Owner decisions required before Phase 1 starts

| # | Decision | Options | Recommended default | Status |
| --- | --- | --- | --- | --- |
| D1 | Final clay/petrol hex values | keep amigo-identical / adopt 05 §1.1 shifted values / owner-picked | 05 §1.1 values | OPEN |
| D2 | Currency in marketing artifacts | ₱ (Philippine-first honesty) / neutral formatting | Owner call — both honest; pick one everywhere | OPEN |
| D3 | Founder line text (proof strip) | draft in 04 §4 | approve or rewrite | OPEN |
| D4 | Category phrase | "construction estimating & proposal software" / quote-team-broader | construction-first (matches product truth) | OPEN |
| D5 | Proposal-handoff claim strength | "client-ready proposal" vs "review-ready proposal" | verify share/export maturity, then choose | OPEN |

## B. Launch gates (all must pass)

### Gate 1 — Claims honesty (P0)
- [ ] Zero fabricated testimonials, logos, metrics, or personas anywhere in DOM/aria/alt.
- [ ] Zero empty media frames (no play buttons without video).
- [ ] Live vs planned capability framing consistent across hero, capability rows, showcase tabs.
- [ ] Every numeric claim is product-truth or beta-fact, verifiable on gate day.

### Gate 2 — Robust visibility (P0)
- [ ] All sections readable with JS disabled.
- [ ] All sections readable with IntersectionObserver never firing (forced).
- [ ] CPU-throttled (×6) fast scroll: no blank paints (record video evidence).

### Gate 3 — Brand & design-system compliance
- [ ] Tokens of 05 §1 in place; no raw amigo hex (`#aa412a`, `#083241`) remaining in landing code
      (grep evidence) unless D1 chose to keep them.
- [ ] DESIGN.md landing Inter scale applied; numbers in mono; sentence-case headings.
- [ ] Color deployment rules (05 §1.4): ≤1 clay surface, 1–2 petrol surfaces; verified per section.
- [ ] Rough-mark vocabulary only; ≤2 marks per viewport; no broken labels at any tested width.
- [ ] Voice bans (04 §5) absent — grep for banned phrases.

### Gate 4 — Accessibility (08 §4 checklist)
- [ ] All 10 checklist rows pass; contrast values recorded per token pairing.

### Gate 5 — Performance (08 §5 budgets)
- [ ] LCP ≤2.5s mobile-throttled; CLS ≤0.1; INP ≤200ms; image payload ≤900KB; budgets evidenced
      with Lighthouse report archived in `screenshots/`.

### Gate 6 — Responsive QA
- [ ] 360/768/1024/1440/1920 screenshot set archived; no horizontal overflow; mobile hero carries
      product proof.

### Gate 7 — Measurement
- [ ] 08 §2 events verified firing in GA4 debug view; consent-gating still intact (no events before
      consent); A/B experiment re-armed.

### Gate 8 — Owner approval
- [ ] Philip reviews live page at desktop + mobile and signs off in this file with date.

## C. Scorecard (target vs audit baseline from 02)

| Dimension | Baseline | Target | Post-implementation (fill in) |
| --- | --- | --- | --- |
| Trust & claims honesty | 3/10 | 9 | |
| First-screen clarity | 5/10 | 9 | |
| Product proof | 4/10 | 9 | |
| Visual distinctiveness | 5/10 | 8 | |
| Brand-system compliance | 4/10 | 9 | |
| Motion quality | 5/10 | 8 | |
| Accessibility | 6/10 | 9 | |
| Performance | 5/10 | 9 | |
| **Overall** | **4.6/10** | **≥8.7** | |

## D. Out of scope for this plan (explicit)

- Public subpages content overhaul (`/features`, `/about`, `/pricing` pages) — covered by
  `.ai/03_plans/landing-page-improvement/14–17` docs; revisit after homepage ships.
- Real testimonial/logo acquisition program (depends on beta partners; proof strip §06.6 is the
  placeholder-free interim).
- Walkthrough video production (slots designed; production is a separate effort).
- i18n / multi-currency marketing variants.
- App/workshop UI — untouched by definition (orange stays landing-only per PRODUCT.md).

## E. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Redesign stalls mid-way leaving mixed registers | Phases are independently shippable; Phase 0 alone is a net win; ship per-phase behind quick owner reviews |
| New palette reads "off" to owner | D1 decision with side-by-side swatch render before Phase 1 proceeds |
| Artifact mockup drifts from real product | Build artifact from `ProductPreviewVariants` primitives that already mirror the workshop UI; revisit at each app milestone |
| Traffic too low for A/B significance | 08 §3 fallback: sequential directional tests + Clarity qualitative |
| Removing testimonials leaves the page feeling thin | Honest proof strip + product-truth density (artifact, capability rows) carries credibility; thinness is better than fabrication |
