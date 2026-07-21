# Executive Brief

## Outcome

Implement a new Archestimator public landing experience at `/new` that follows the section rhythm of the Velora UI SaaS template while feeling unmistakably like Archestimator: light, precise, practical, design-aware, and commercially credible.

The route is a preview surface. It must remain separate from the current `/` page, remain excluded from indexing, and be safe to review without changing the live marketing route.

## Product story

Archestimator is construction estimating software: an estimate-to-proposal workspace built around reusable cost intelligence.

The landing page must present one clear story rather than a broad catalogue:

> AEC teams should be able to build an estimate, reuse what they already know, present the number clearly, collect review context, revise the work, and record the decision without losing the connection between those steps.

The narrative wedge is the handoff from estimate to client-facing proposal and back through review and revision. Reusable cost knowledge supports that loop. It is not a separate abstract platform story.

## Approved public promise

Use this as the page’s final promise and conceptual spine:

> Keep the estimate, proposal, and conversation connected.

Use this as the primary hero:

> Make every estimate easier to build, clearer to present, and simpler to approve.

Use this as the primary CTA everywhere:

> Request early access

The public benefit stack is:

> Less rework. Clearer proposals. Better cost decisions.

These lines come from the canonical Archestimator product and brand corpus. Do not paraphrase them into a louder or more speculative claim.

## Design thesis

### Preserve from Velora

Preserve the reference template’s:

- clear top-to-bottom cadence;
- centered hero with a large product frame;
- compact outcome row directly below the hero;
- moving audience/proof band;
- asymmetric bento feature block;
- two alternating product-story sections;
- three concise value cards;
- high-density proof/content grid;
- decision-oriented two-card conversion section;
- compact FAQ;
- atmospheric final CTA;
- light footer.

### Replace from Velora

Replace its:

- dark-first presentation;
- animated rotating headline;
- avatars, star rating, customer count, and customer logos;
- numeric product stats;
- generic integration diagram;
- generic activity feed;
- testimonials;
- public pricing cards;
- component-library copy;
- “free forever” and conversion claims.

### Borrow from LaunchPad

Borrow only interaction ideas:

- tactile hover and focus states;
- scroll-led section entrances;
- living product UI rather than static decorative screenshots;
- numbered process progression;
- restrained horizontal flow;
- small parallax or ambient depth cues.

Do not copy LaunchPad code, assets, layout geometry, 3D scenes, rocket/space metaphors, copy, or visual identity.

## Page shape

The final route has this order:

1. scroll progress;
2. light sticky header;
3. approved hero and real product demonstration;
4. four nonnumeric workflow outcomes;
5. audience marquee;
6. four-card product bento;
7. connected commercial-record flow;
8. revision/activity story;
9. three product principles;
10. six “what stays connected” cards;
11. design-partner early-access section;
12. five-question FAQ;
13. final CTA and compact workflow dock;
14. light footer.

This maps one-for-one to Velora’s macrostructure while replacing every inappropriate proof or commerce section with truthful Archestimator content.

## Scope

### In scope

- `src/app/new/page.tsx`;
- a new public-owned component folder under `src/components/landing-new`;
- scoped light-theme CSS and animation primitives;
- reuse of `ArchestimatorLogo`;
- reuse of `HeroEstimateWorkspaceMockup`;
- a backward-compatible playback/static-mode extension to that hero mockup if required;
- exact copy from this pack;
- noindex metadata for `/new`;
- CTA links to `/contact?intent=beta-request`;
- sign-in and logged-in workspace behavior;
- existing consent-gated landing analytics;
- responsive, accessibility, reduced-motion, and performance behavior;
- source-level verification and an honest test-proposal record.

### Out of scope

- replacing or redirecting `/`;
- editing the current `landing-v3` page or its copy;
- changing the contact form or access-request backend;
- adding public pricing;
- adding a sample-proposal CTA without a verified public sample;
- adding customer logos, testimonials, counts, ratings, or outcome statistics;
- promoting AI, procurement, payments, marketplaces, or portfolio features;
- changing authenticated application design;
- changing global tokens solely for this route;
- adding a second animation library;
- database, auth, provider, deployment, or analytics-provider changes;
- creating or running automated tests without explicit authorization;
- committing, pushing, opening a pull request, or deploying.

## Fixed technical decisions

| Decision | Resolution |
|---|---|
| Route | `/new` only; static and noindex |
| Page shell | `PublicPageShell` with `isHomePage` so the route owns its header/footer but retains consent and analytics |
| Product proof | Reuse the current sanitized `EstimateWorkspaceClient` hero demo |
| Hero playback | Desktop/fine-pointer/in-view loop; mobile and reduced motion show a static final state |
| Animation runtime | Existing GSAP plus CSS; do not add Motion or Framer Motion |
| Font | Existing Geist and Roboto Mono variables |
| Brand accent | Signal orange for presence; darker orange for small text and accessible CTA fills |
| CTA | “Request early access” → `/contact?intent=beta-request`; logged-in visitors may see “Open workspace” |
| Secondary hero CTA | Omit; do not invent a sample proposal |
| Social proof | None until verified customer evidence exists |
| Pricing | None; replace with design-partner expectations |
| Content location | Typed `new-landing-content.ts` rather than inline scattered strings |
| Client JavaScript | Restrict to the hero demo, motion controller, auth hint, menu details, and existing analytics |
| Live route safety | Existing behavior remains the default in every shared component |

## Information-density ceiling

The implementation must not “win” by adding more copy.

Use these hard ceilings:

- one heading and one short lead per major section;
- four bento cards;
- three principle cards;
- six connection cards;
- five FAQs;
- no paragraph longer than 55 words;
- no feature list longer than four items;
- no numeric proof;
- approximately 700–900 words of main narrative copy, excluding FAQ, legal links, and accessibility labels;
- every section must answer one visitor question only.

## Quality target

The page should feel:

- lighter than the current reference template;
- more product-specific than a generic startup landing page;
- more composed than an animation showcase;
- less editorially dense than the current `/` landing route;
- credible for estimators, architects, engineers, contractors, design-build teams, and commercial-interiors teams;
- explicit about pre-release status;
- confident without pretending market dominance.

## Stop condition

Stop implementation when the requested `/new` experience is complete and the acceptance matrix is reconciled. Do not extend the task into a marketing-site rewrite, a design-system migration, contact-flow redesign, sample-proposal project, or release operation.
