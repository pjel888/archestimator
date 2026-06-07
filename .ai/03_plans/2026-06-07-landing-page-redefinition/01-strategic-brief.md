---
title: Strategic Brief
date: 2026-06-07
status: draft-for-implementation
plan_id: landing-page-redefinition-2026-06-07
---

# Strategic Brief

## Summary

Redefine the public landing page as an editorial, closed-beta explanation of the Archestimator method: structured cost proposal work that preserves offer logic from quote sheet to proposal handoff.

The page should feel fuller, more intentional, and more commercially literate without becoming louder or less honest. The hero background can remain. The major change is below and around it: sharper positioning, better proof rhythm, truthful video/storyboard slots, stronger copy, and closed-beta conversion language.

## Problem Frame

The current homepage has three disconnects:

1. It no longer carries the full company direction.
   Archestimator has moved from "construction estimator" toward a cost proposal workspace for quote-heavy teams, suppliers, buyers, contractors, and future supplier-linked workflows.

2. It feels under-proven.
   The current live page moves from hero to abstract method blocks, placeholder company proof, solution cards, pricing, FAQ, and final CTA. It lacks an immediate, honest artifact that helps a visitor understand what the workflow is.

3. It mixes conversion expectations.
   CTAs such as `See the workspace`, `Try Workspace`, `Open workspace`, and `Request access` create different expectations. Closed beta should feel intentional, not like a public product with inconsistent gates.

## Requirements

### R1. Match the Current Company Identity

Position Archestimator as a structured quote, estimate, and proposal workspace for itemized commercial offers. Construction estimating remains the current proof case, not the whole company identity.

### R2. Keep the Hero Direction

Preserve the orange/Three.js hero art direction. Copy can be refined, but the plan does not require replacing the hero visual system.

### R3. Add Honest Workflow Proof Early

Add the first proof object immediately after or within the hero continuation: a labeled workflow video placeholder or storyboard slot. It must not be a fake screenshot or unlabeled mockup.

### R4. Do Not Use App Screen Mockups

No static app screen mockups, fake dashboard screenshots, faux product UI panels, or unlabeled planned feature images. Video placeholders may link to future app walkthroughs, but must be honest placeholders with maturity labels.

### R5. Replace Placeholder Logo Proof

Do not visually simulate customer logos while the beta lacks permissioned proof. Replace the current company-proof rail with workflow proof, sample workflow types, or a closed-beta evidence rail.

### R6. Make Closed Beta the Conversion Model

Anonymous visitors should see `Request beta access` as the primary CTA. Authenticated/allowlisted visitors may see `Open workspace`. Pricing should remain no-payment and exploratory.

### R7. Use Conservative Feature Maturity Labels

Every public feature block must be mapped to one of:

- `Available in MVP preview`
- `Partially available in MVP preview`
- `Planned next`
- `Do not claim yet`

### R8. Broaden Audiences Without Losing Focus

The homepage should name the real audiences:

- Quote-heavy sales teams and suppliers building itemized offers
- Buyers, clients, and operations teams reviewing proposal options
- Contractors, estimators, fit-out teams, and AEC teams as the current proof case
- Supplier/library maintainers as the future cost intelligence layer

### R9. Keep AI Secondary

AI can appear only as future or assistive language, not as a leading value claim. If mentioned, it must be human-reviewed, ask-only or roadmap-framed, and privacy-safe.

### R10. Preserve Public Route Strategy

The homepage handles awareness and thesis. `/features` handles feature status. `/pricing` handles beta access and pricing uncertainty. `/about` handles founder-market fit. `/contact` handles access/discovery.

### R11. Improve Visual Density and Rhythm

The page should no longer feel empty. Add stronger section contrast, editorial objects, short proof rails, and structured layouts, but avoid card piles, nested cards, and generic decorative filler.

### R12. Verify With Tests and Browser QA

Implementation must pass targeted landing tests, route/copy assertions, accessibility checks, reduced-motion checks, desktop/mobile browser checks, and a claim-safety audit.

## Scope Boundaries

### In Scope

- Homepage strategy and implementation plan
- Copywriting and narrative architecture
- Visual direction and media placeholders
- CTA and closed-beta conversion alignment
- Public claim safety
- Route handoff guidance for `/features`, `/pricing`, `/about`, and `/contact`
- Landing tests and browser QA plan

### Out of Scope

- Rebuilding the authenticated workshop UI
- Creating real product videos
- Designing app screen mockups
- Implementing supplier marketplace, PO execution, legal automation, autonomous AI estimating, or mature compliance
- Finalizing pricing tiers
- Publishing customer logos, testimonials, or performance metrics without permissioned evidence

## Key Technical Decisions

### KTD1. Homepage Becomes a Category Reset, Not a Feature Dump

The homepage should teach the visitor what a cost proposal workspace is and why it matters. Detailed feature status belongs on `/features`.

### KTD2. Video Placeholders Are Proof Slots, Not Product Screenshots

Use video cards as labeled containers for future 8 to 12 second walkthroughs. They should show intent and workflow sequence, not pretend that planned workflows are live.

### KTD3. Replace Social-Proof Simulation With Workflow Evidence

Until customer proof exists, a logo rail creates more risk than trust. The better proof is workflow specificity: fit-out package quote, supplier catalog reuse, value-engineering option, revision review, proposal handoff.

### KTD4. Closed Beta Is a Trust Signal

The page should frame beta access as founder-led, careful, and collaborative. It should not feel like public self-serve signup is broken.

### KTD5. Construction Is the Proof Case, Not the Category Ceiling

Use construction/fit-out examples because the current product proves them, but the page should remain legible to suppliers, quote-heavy sales teams, and buyer-side proposal reviewers.

### KTD6. Planned Capability Language Must Be Structural

Say "planned proposal handoff" or "planned revision context," not "generate client-ready proposals today" or "track every change."

### KTD7. Visual Direction Should Be More Authored, Less Empty

Keep the landing page more editorial than the workshop, but retain Archestimator's discipline: crisp borders, commercial-document cues, restrained orange outside the hero, and clear density where proof is needed.

## Implementation Units

### U1. Current Surface and Claim Audit

Inventory current homepage copy, route links, feature labels, CTA labels, and maturity claims.

Acceptance:
- A copy/claim spreadsheet or markdown table exists.
- Each homepage claim maps to live, partial, planned, or unsafe status.
- No planned feature is allowed into implementation without a label.

### U2. Narrative and Copy Rewrite

Rewrite the homepage around the thesis: better proposals start with better cost intelligence.

Acceptance:
- H1/support/CTA and every section heading can pass a five-second test.
- Copy avoids generic SaaS phrases and unsupported outcome claims.
- The page names closed beta before the visitor reaches pricing.

### U3. Section Architecture

Recompose the homepage into a fuller narrative flow:

1. Header
2. Hero
3. Workflow video placeholder
4. Problem narrative
5. Who it is for
6. The Archestimator method
7. Workflow/storyboard cards
8. Feature maturity truth block
9. Closed-beta invitation
10. FAQ
11. Final CTA
12. Footer

Acceptance:
- `src/app/page.tsx` reflects the new order.
- No dead nav anchors remain.
- Mobile and desktop layouts preserve clear rhythm.

### U4. Video Placeholder System

Create reusable video placeholder cards or sections that support status labels, future video URLs, captions, and reduced-motion poster states.

Acceptance:
- No placeholder visually reads as a finished app screenshot.
- Every video slot has a maturity label and purpose.
- Empty/future video states are graceful.

### U5. Closed-Beta CTA Alignment

Normalize CTA labels across header, hero, pricing, final CTA, and footer.

Acceptance:
- Anonymous primary CTA: `Request beta access`.
- Logged-in/allowlisted primary CTA: `Open workspace`.
- `Try Workspace` is removed or used only where auth logic makes the gate clear.

### U6. Cross-Route Alignment

Update or verify `/features`, `/pricing`, `/about`, and `/contact` so they do not contradict the homepage.

Acceptance:
- `/features` exposes feature maturity labels.
- `/pricing` says closed beta/no payment/pricing after beta.
- `/about` stays fact-gated.
- `/contact` supports beta access and discovery.

### U7. QA and Release Gate

Run targeted tests and browser QA.

Acceptance:
- Landing vitest suite passes.
- E2E landing audit passes or has documented residual risk.
- Browser screenshots pass desktop/mobile/no-overflow/reduced-motion checks.
- Claim-safety audit has no unsafe public claims.

## Risks

### Risk: The page becomes too abstract

Mitigation: Put a workflow video placeholder right after the hero and use concrete workflow examples in every section.

### Risk: The page overclaims planned product

Mitigation: Use maturity labels and maintain a claim matrix before implementation.

### Risk: Video placeholders become fake product proof

Mitigation: Label them as `Recording slot`, `MVP preview`, or `Planned storyboard`; avoid screenshot styling.

### Risk: Broadening beyond construction blurs ICP

Mitigation: Use a two-layer audience model: quote/proposal workspace category, construction/fit-out proof case.

### Risk: The page becomes card-heavy

Mitigation: Use large editorial bands, tables, rails, and media objects. Reserve cards for video slots and repeated workflow items.

## Open Questions

- Should the hero headline stay as the current `A clearer workspace for quote sheets and proposal handoff.` or move to the Notion-recommended `Better proposals start with better cost intelligence.`?
- Which first beta workflow should be recorded first: estimate setup, component reuse, revision review, or proposal handoff?
- Should the homepage mention client-side proposal records now as a future direction, or reserve that for `/features` and pitch materials?
- Which support/contact destination should `Request beta access` use during closed beta: `/contact`, a dedicated beta request route, or the existing auth gate?
