# UNIT-006 — Build Trust, Status, FAQ, and Close

**Status:** READY  
**Depends on:** UNIT-005  
**Goal:** Implement Attio ordinal Bands 12–18 one-for-one with truthful substitutes for testimonial, scale, customer-story, changelog, and newsletter proof before the final CTA/footer.

## Owned paths

- `src/components/landing/new-redesign/sections/TrustAndClose.tsx`
- `src/components/landing/new-redesign/sections/TrustAndClose.module.css`
- final content-only adjustments in `content.ts` when source verification requires them

## Implementation

1. Build Founder Trust from verified corpus/about facts: the founder perspective combines architecture and software engineering around estimating/communication friction. Do not write a customer testimonial.
2. Build the Honest Proof matrix with four principles—Structured, Traceable, Reviewable, User-controlled—and source-verified supporting facts.
3. Build an Illustrative Workflow story as a distinct, clearly labelled fictional-data band with four manual tabs—Estimate, Reuse, Review, Decision. Preserve the customer-story layout role without customer language, logos, testimony, or quantified outcome.
4. Build the Current Product rail as a separate changelog-position band with four non-autoplay cards: structured estimating, reusable library, proposal/Excel output, client review/decision.
5. Use native horizontal mandatory snap on mobile; story/status cards keep a readable fixed width.
6. Build the Early-Access Briefing and four-question FAQ as the separate newsletter-position band. Use native `details/summary` on mobile; desktop may remain expanded or use the same native semantics. Do not add an embedded email capture or fake subscription state.
7. Build the dark final CTA with the same label/destination as the hero and a local Signal mark, never a full-orange band.
8. Finalize owned footer content with verified existing links only.
9. Ensure no secondary conversion route appears.

## Acceptance

- No customer logo, testimonial, metric, ROI, time saving, accuracy, security-grade, public-availability, or funding claim is fabricated.
- Founder statement is attributable to supplied/current source.
- Proof/status cards state only current or explicitly partial capability.
- Bands 12 through 18 are distinct and ordered exactly as the architecture contract; customer-story and changelog substitutes are not merged.
- Illustrative workflow disclosure is visible and cannot be mistaken for a real customer case study.
- FAQ answers the commitment and Excel-workflow questions plainly.
- Hero, announcement, FAQ link, header, and final CTA use the same canonical destination.
- Final CTA is dark with local Signal, not a solid orange section.

## Decisive verification

- Content diff against `CONTEXT/README.md`, `CONTEXT/claim-reconciliation.md`, canonical corpus sections, `src/app/about/page.tsx`, and exact current product sources.
- Route/link existence scan for every footer/navigation destination.
- Type/LSP diagnostics and scoped lint.

## Recovery

Remove the owned section files and restore the scaffold slots. The active route is still unchanged.
