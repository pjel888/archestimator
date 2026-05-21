# Landing Page Conversion Flow and Company Carousel Research

**Date:** 2026-05-21
**Status:** Planning research; no implementation.
**Scope:** Public `/` landing page below the accepted hero.
**New user requirement:** Add a companies-who-use-us carousel immediately after the hero. The carousel should span and scroll horizontally across the full page, not sit inside the focused middle container.

## Hard boundaries

- The hero/above-the-fold remains accepted and locked.
- The company carousel is the first section after `HeroSection`.
- The carousel is a deliberate exception to the focused-middle content rule.
- The rest of the below-hero content should still use centered Tailwind containers/focused max widths.
- No fake companies, fake logos, fake testimonials, fake customer counts, or unapproved trust claims in production.
- Placeholder company entries are allowed during first implementation only if clearly marked as placeholders and prevented from becoming inflated production social proof.

## Research sources checked

External conversion/UX sources:

- Unbounce, `What Is a Landing Page? Landing Pages Explained`, accessed 2026-05-21. Relevant finding: successful landing pages use a clear headline, focused concise content, strong CTA, high-quality visuals, social proof/trust signals, and mobile-friendly design.
- Nielsen Norman Group, `F-Shaped Pattern of Reading on the Web: Misunderstood, But Still Relevant`, accessed 2026-05-21. Relevant finding: users scan web content; strong headings, chunking, and visual hierarchy are necessary to prevent users from missing key information.
- Nielsen Norman Group, `Social Proof in the User Experience`, accessed 2026-05-21. Relevant finding: social proof can influence user decisions when it credibly represents other people's behavior, beliefs, or advice; it should be tested and used responsibly.

Live SaaS reference pages sampled by headings/source structure:

- Stripe homepage, accessed 2026-05-21: category/promise first, then flexible solution modules, then global commerce proof and customer stories.
- Intercom homepage, accessed 2026-05-21: sharp category/promise, then complete solution architecture, product modules, and AI-agent proof.
- Linear homepage, accessed 2026-05-21: product-development positioning, then feature chapters explaining workflows and future-ready system value.
- Notion product page, accessed 2026-05-21: promise first, then use cases/features and product capability modules.
- Webflow homepage, accessed 2026-05-21: concise platform promise, trust scale, platform modules, and enterprise/product proof.

## Conversion principles from the research

### 1. The top of page must answer category, promise, and trust quickly

A visitor should understand:

- what Archestimator is;
- who it is for;
- what better state it creates;
- why it is credible enough to keep reading.

The accepted hero handles category/promise. A company carousel immediately after the hero can handle early trust, but only if the companies are real and permission-safe.

### 2. Social proof belongs early only when it is credible

A logo carousel after the hero is useful when it lowers perceived risk:

- recognizable companies;
- actual users, pilot teams, design partners, or customers;
- wording that matches the real relationship.

It becomes harmful if it looks inflated or fabricated. For Archestimator, the carousel must not exist as decorative filler.

### 3. Product proof must follow trust proof quickly

After social proof, show the product method. Do not make visitors scroll through abstract claims before seeing what the workspace does.

For Archestimator, the next major section should still be the product/workspace proof surface: project-shaped estimate structure, line items, cost logic, revisions, and proposal/export path.

### 4. Long-form conversion pages work best as a sequence of answered objections

The page should answer objections in order:

1. Is this for me?
2. Is this credible?
3. What does it actually look like?
4. Why is it better than spreadsheets/proposal rework?
5. What capabilities matter to my estimating workflow?
6. What output can I hand to clients/internal reviewers?
7. Is it safe/ready enough to try?
8. What should I do next?

### 5. Scanability matters as much as section order

Visitors scan. The page needs strong section titles, compact proof blocks, and clear CTA rhythm. A focused container after the full-width carousel helps the content read as deliberate chapters instead of a wide generic SaaS page.

## Recommended landing-page flow for Archestimator

### 0. Header

Purpose:

- orient the user;
- keep navigation light;
- route to workshop/login/CTA.

Current status:

- Existing landing header can remain unless anchors change.

### 1. Hero — locked

Purpose:

- state category and promise;
- speak to construction cost estimators;
- set visual confidence.

Current status:

- Accepted for this pass. Do not touch.

### 2. Full-width company proof carousel — new immediate post-hero section

Purpose:

- lower risk fast;
- show that real companies/teams use or evaluate Archestimator;
- create momentum before the product proof section.

Layout:

- full-bleed horizontal strip;
- not inside the focused middle container;
- `overflow-hidden` marquee track across the viewport;
- optional centered label above or inside the strip, but logo motion itself should span edge-to-edge;
- subtle borders or background to separate it from hero and product preview;
- grayscale/low-contrast logos unless brand policy requires original color;
- hover/focus can pause motion if logos are linked.

Truth gate:

- placeholders are allowed in the first build to prove layout and motion;
- placeholder entries must be explicitly marked in the data model and must not use real-logo/customer wording;
- before launch/social-proof claims, use only verified companies/users/design partners;
- logo permission or a clear permission-safe policy;
- wording must match relationship:
  - `Used by teams at...` only if true;
  - `Trusted by...` only if there is real customer trust/proof;
  - `Design partners and early users include...` if pre-customer;
  - hide the carousel or keep neutral placeholder wording if the list is not real.

### 3. Product proof / workspace preview

Purpose:

- answer “what does this actually look like?”;
- show the estimating method immediately after trust proof.

Content:

- Estimate Workspace;
- hierarchy/tree;
- line items;
- totals;
- component picker or preview;
- revision/output cues.

Layout:

- centered container/focused width, not full-bleed content sprawl.

### 4. Secondary method bridge

Purpose:

- bridge from hero promise and trust into the Archestimator method.

Recommended framing:

- `The most intuitive way to create construction cost estimates` can remain below hero/product proof if immediately supported by concrete workflow evidence.

### 5. Problem-to-method section

Purpose:

- name the current pain without shaming spreadsheet users;
- explain why disconnected estimates, revisions, and proposals create rework.

Content direction:

- scattered sheets;
- copied line items;
- revision drift;
- unclear assumptions;
- proposal handoff friction.

### 6. Feature/value chapters

Purpose:

- present the approved public feature anchors as a coherent workflow, not a random feature grid.

Required anchors:

1. Estimate Workspace
2. Component Library
3. Revision Intelligence
4. Proposal Comparisons
5. Visual Cost Breakdowns
6. Proposal-Ready Outputs
7. Industry Standard Export Formats

### 7. Output/proposal proof

Purpose:

- show what leaves the workspace;
- prove usefulness to project teams and clients.

Content:

- PDF proposal packages;
- Excel export/handoff;
- visual cost breakdowns;
- traceable revisions/comparisons.

### 8. Readiness / pricing / early-access section

Purpose:

- reduce adoption anxiety;
- clarify MVP/preview posture;
- avoid pretending pricing/product maturity is final if it is not.

### 9. Final CTA

Purpose:

- repeat the next action after the visitor has seen proof.

Recommended CTA posture:

- calm, direct, and route-accurate;
- no fake urgency.

## Company carousel implementation plan for later

### Likely files

- Create: `src/components/landing/CompanyProofCarouselSection.tsx`
- Modify: `src/components/landing/index.ts`
- Modify: `src/app/page.tsx` to place the section immediately after `HeroSection`
- Optional create: `src/components/landing/company-proof-data.ts`
- Optional assets: `public/company-logos/*`
- Optional tests: `tests/vitest/landing-page.test.tsx`

### Suggested data contract

```ts
export type CompanyProofLogo = {
  name: string;
  logoSrc?: string;
  initials?: string;
  websiteHref?: string;
  relationship: "placeholder" | "customer" | "pilot-user" | "design-partner" | "internal-team";
  permissionConfirmed: boolean;
  isPlaceholder?: boolean;
  publicLabel: string;
};
```

Rules:

- Allow placeholder entries in development/first implementation only when `relationship: "placeholder"` or `isPlaceholder: true` is explicit.
- In production social-proof mode, do not render entries with `permissionConfirmed: false`.
- Do not use `customer` wording for pilot users, design partners, or placeholders.
- Do not duplicate the semantic list for marquee looping without `aria-hidden` on duplicate tracks.
- If there are no verified logos at launch, hide the section or keep neutral non-proof wording approved by Philip.

### Motion/accessibility rules

- Use CSS animation first; no GSAP needed for a logo marquee.
- Duplicate the logo list visually for seamless loop, but expose only one semantic list to assistive technology.
- Respect `prefers-reduced-motion: reduce` by stopping the animation and rendering a static/wrappable or manually scrollable logo row.
- Do not make every logo link if there is no meaningful destination.
- If logos are links, provide accessible names such as `Company name website`.
- Pause animation on hover/focus if links exist.

### Visual rules

- Full-width strip, not inside the focused content container.
- Logo track should visually cross the full viewport.
- Use subtle section padding: enough to breathe, not enough to become another hero.
- Use muted logos so the hero and product preview remain primary.
- Avoid a loud “customer wall” if the product is still early.

## Recommended conversion architecture decision

Adopt this sequence for the current planning direction:

1. Header
2. Locked Hero
3. Full-width Company Proof Carousel
4. ProductShowcaseSection / ProductPreview
5. SecondaryClaimSection
6. Problem-to-method / SolutionSection
7. EstimatorEngineSection or workflow explanation
8. FeaturesSection using approved feature anchors
9. Output/proposal/export proof
10. Readiness/pricing/early-access
11. FinalCTASection

This gives the page a clearer conversion logic:

- promise;
- trust;
- product proof;
- method;
- features;
- output;
- adoption reassurance;
- CTA.

## Readiness gate additions

Before implementation:

- [ ] Confirm real company names/logos and relationship wording.
- [ ] Confirm logo usage permission or acceptable public-use policy.
- [ ] Decide carousel label wording based on actual relationship.
- [ ] Confirm carousel should render only when verified logos exist.
- [ ] Confirm the carousel is the one full-width exception after the locked hero.

After implementation:

- [ ] Hero remains unchanged.
- [ ] Carousel appears immediately after hero.
- [ ] Carousel spans full viewport width.
- [ ] Below-carousel sections still use focused centered containers.
- [ ] Reduced-motion mode disables/changes auto-scroll.
- [ ] No fake or unverified company proof is rendered.
- [ ] Mobile layout does not create horizontal page overflow.
