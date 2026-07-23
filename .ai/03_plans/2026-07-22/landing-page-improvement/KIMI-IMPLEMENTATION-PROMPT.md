# Kimi Implementation Prompt: Archestimator Public-Root Landing Page

Use this as the first task in a Kimi Code session opened at `/Users/philiplewis/archestimator`.

The repository `AGENTS.md` remains the durable authority. This prompt is the implementation task. It uses explicit roles, delimited evidence, ordered execution, and a bounded handoff because those patterns are recommended by Moonshot's current Kimi prompt guidance.

<role>
You are the lead frontend implementation agent for Archestimator. Act as a senior product designer, art director, conversion writer, interaction designer, accessibility engineer, performance engineer, and Next.js 16 frontend engineer.

Make decisions from current repository evidence. Implement the result in the repository. Do not stop at a strategy document, moodboard, wireframe, self-score, or isolated code sample.
</role>

<mission>
Rebuild the public root landing page at `/` as a complete, production-ready, light and airy product story.

The page must make this clear in the first viewport:

1. Archestimator is construction estimating software for AEC teams.
2. It helps structure estimates, reuse cost knowledge, present proposals, and keep reviews/revisions attached to the same commercial record.
3. The primary action is `Request beta access`.

The result should be memorable because it is precise, truthful, well-paced, and technically controlled. It must not become a generic SaaS template or a motion demo that hides the product.
</mission>

<authority>
1. Read and obey the nearest applicable `AGENTS.md` files.
2. Run the repository startup steps required by `AGENTS.md`.
3. Inspect `git status --short --branch` before edits and preserve unrelated work.
4. Current source is authoritative for routes, product behavior, claims, dependencies, and validation boundaries.
5. Read this plan pack before editing:
   - `@.ai/03_plans/2026-07-22/landing-page-improvement/README.md`
   - `@.ai/03_plans/2026-07-22/landing-page-improvement/00-PLAN.md`
   - `@.ai/03_plans/2026-07-22/landing-page-improvement/01-CURRENT-STATE-AND-PROOF.md`
   - `@.ai/03_plans/2026-07-22/landing-page-improvement/02-DESIGN-REFERENCE-MOTION-SPEC.md`
   - `@.ai/03_plans/2026-07-22/landing-page-improvement/03-VALIDATION-RESUME-AUDIT.md`
6. Treat external reference pages as design research only. Never copy their protected assets, copy, customer proof, distinctive composition, or product UI.
</authority>

<required-discovery>
Before editing, inspect:

- `@src/app/page.tsx`
- `@src/app/new/page.tsx`
- `@src/components/landing-production/`
- `@src/components/landing-production/new-landing-content.ts`
- `@src/components/landing-production/NewLandingHeroDemo.tsx`
- `@src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx`
- `@src/app/globals.css`
- current source needed to prove every visible product claim
- the relevant installed Next.js 16 guide under `node_modules/next/dist/docs/` before changing framework conventions

Then state one concise decision checkpoint in your working response:

- design thesis;
- exact files expected to change;
- exact hero proof provenance;
- later screenshot slot plan;
- GSAP/Three architecture;
- desktop, mobile, reduced-motion, and no-WebGL fallback strategy.

Proceed after that checkpoint. Do not wait for confirmation on ordinary reversible local choices.
</required-discovery>

<current-source-facts>
- `/` currently renders `ArchestimatorNewLandingPage` inside `ProductionPublicPageShell`.
- `/new` is a noindex legacy reference and must remain unchanged.
- The current exact hero proof is the sanitized estimate workspace exposed by `HeroEstimateWorkspaceMockup` and wrapped by `NewLandingHeroDemo`.
- Despite its file name, `HeroEstimateWorkspaceMockup` mounts the real current `EstimateWorkspaceClient` with sanitized local fixture data and deterministic states.
- The current wrapper adds fake browser dots, a URL bar, a glow, and browser-like framing. Those presentation elements must be removed.
- The user referred to the exact proof as the `/new` hero. Resolve that wording to the current source component identity, not the legacy route's placeholder composition.
- GSAP, `@gsap/react`, Three.js, and Three types are already installed. Add no dependency.
</current-source-facts>

<product-truth>
The hero must use the current exact sanitized estimate workspace. It is the one product-proof surface that may not be a placeholder.

If any later visual appears to be Archestimator software, it must be:

- an exact current repository component in a safe presentation/fixture mode; or
- an exact current capture whose route and state are documented.

The user permits later screenshot placeholders. A valid placeholder is a neutral media slot that says `Exact product capture required` and names the future route/state. It must not contain fake controls, tables, dashboards, browser chrome, totals, comments, charts, fields, or product-inspired UI.

Every non-product relationship scene must visibly say:

`Conceptual workflow visualization, not product interface`

Do not invent or imply:

- AI features;
- BIM or automated takeoff;
- unbuilt integrations;
- customers, testimonials, logos, metrics, awards, savings, pricing, or market claims;
- public availability;
- automated beta acceptance;
- any behavior current source does not prove.

Do not expose allowlists, manual approval, cohorts, or internal beta mechanics.
</product-truth>

<design-direction>
Build a daylight-first visual system:

- warm white or pale porcelain canvas;
- near-black ink;
- quiet warm-gray secondary text;
- fine structural rules and paper-like surfaces;
- existing `--brand-orange` as the primary CTA fill and the continuous cost-thread signal;
- compact, high-contrast typography using the existing licensed project fonts;
- wide desktop composition with a calm copy measure and large exact product proof;
- deliberate asymmetry and section divisions, not repeated equal cards.

Use subtle liquid-glass hints from the workshop/app only where they communicate hierarchy:

- a thin translucent header after scroll;
- a small stage label or foreground control plate;
- at most one blur layer per visual region;
- opaque fallback with the same hierarchy.

Do not use glass as the default container system.
</design-direction>

<reference-dna>
Use the following transferable principles without cloning:

- Intercom: sharp proposition followed by varied product proof.
- Fathom: domain credibility through native artifacts and clear divisions.
- Mistral: confident typography and modular narrative without platform sprawl.
- Rows: short copy paired with focused proof and restrained interaction.
- Agentwork: a sparse, direct workflow explanation.
- Taito.ai: claim, literal app proof, why, workflow proof, credibility, conversion.

Read `@.ai/03_plans/2026-07-22/landing-page-improvement/research/REFERENCE-SITE-SYNTHESIS.md` for the evidence and non-copy boundaries.
</reference-dna>

<copy-deck>
Use this as the approved base. Make only small factual corrections required by current source. Avoid em dashes in visible copy.

Pre-release:
- `Pre-release beta`
- `Request access: support@archestimator.com`

Navigation:
- `Product`
- `Workflow`
- `FAQ`
- Primary: `Request beta access`
- Signed in: `Open workspace`

Hero:
- Context: `Construction estimating, without the broken handoff.`
- Headline: `Build the estimate. Keep the context.`
- Support: `One connected workspace for AEC teams to structure estimates, reuse cost knowledge, present proposals, and keep reviews and revisions attached to the same commercial record.`
- Primary CTA: `Request beta access`
- Secondary link: `Follow the workflow`
- Note: `Built for the full estimate-to-proposal workflow.`
- Proof disclosure: `Sanitized Archestimator workspace demonstration`

Three-part value strip:
1. `Structured around real scope`
2. `Excel stays in the workflow`
3. `Client review stays attached`

Problem:
- Headline: `The number is only half the story.`
- Body: `Spreadsheets hold the estimate. PDFs hold the issue. Email and chat hold the questions. The next revision becomes another file. The number, its source, and the decision stop sharing the same record.`

Workflow:
- Headline: `Follow the number.`
- Intro: `One connected record from first scope to final decision.`
- Stages: `Structure`, `Reuse`, `Issue`, `Review`, `Revise`

Connected record:
- Headline: `What stays connected.`
- Pairs: cost/source note, component/supplier or variant, estimate/proposal, comment/proposal context, revision/changed value, decision/activity history.

Audience:
- Headline: `For teams that own the number.`
- Use the current source-backed AEC role list without personas or testimonials.

Closing:
- Headline: `Keep the estimate and decision connected.`
- Body: `Request beta access and bring the estimating or proposal handoff you want to improve.`
- CTA: `Request beta access`

FAQ:
- Who is Archestimator for?
- Does Archestimator replace Excel?
- What can teams save and reuse?
- Can clients review and respond to proposals?
- Is Archestimator generally available?

Re-audit the client-review answer against current source and narrow it if needed.
</copy-deck>

<page-architecture>
Implement these eight chapters. Do not add filler.

1. Compact header and exact-proof hero.
2. Three-part value strip.
3. Broken-handoff editorial chapter with a concept label.
4. Five-stage `Follow the number` GSAP/Three story.
5. Up to three focused product-proof modules using exact captures or neutral replacement slots.
6. Connected-record ledger/matrix, not six equal cards.
7. Compact audience, beta status, and FAQ.
8. Final CTA and compact footer.

Delete or consolidate the current outcomes/bento/activity/principles/matrix sprawl instead of restyling every old card.
</page-architecture>

<hero-proof>
Keep the current exact sanitized workspace component and its truthful disclosure.

Remove:

- browser traffic-light dots;
- fabricated URL bar;
- browser-window framing;
- decorative hero glow;
- aurora fields;
- any fake product chrome.

Preserve:

- static server/first-client phase;
- exact product content and sanitized fixture;
- intersection visibility gate;
- desktop-only loop behavior;
- reduced-motion static state;
- pause while the document is hidden;
- accessible region label and inert presentation behavior.

Do not replace the hero with a screenshot slot or a redesigned imitation.
</hero-proof>

<cost-thread>
Use one orange cost thread as the page's visual grammar.

It begins under the hero, separates in the broken-handoff section, reconnects across the five-stage workflow, links the connected-record pairs, and resolves into the final CTA.

The thread must communicate continuity. Do not add unrelated orange squiggles or multiple competing line systems.
</cost-thread>

<gsap-three-contract>
GSAP ScrollTrigger owns native document scroll progress. Three.js never owns scrolling and never intercepts wheel/touch input.

Create one labelled desktop timeline:

`structure -> reuse -> issue -> review -> revise`

Desktop behavior:

- pin only the workflow stage;
- keep copy semantic and readable beside the stage;
- use transforms, opacity, SVG line progress, masks, shallow camera motion, and material emphasis;
- use a restrained numeric scrub only if needed;
- no snap by default;
- reverse scroll must restore the same coherent states;
- motion stops when scroll stops;
- use `useGSAP` or `gsap.context`, `gsap.matchMedia`, scoped selectors, and full cleanup.

Three.js scene:

- one light, shallow connected-record scene;
- simple paper-like planes/data fragments and one orange path;
- no building, globe, orb, particle field, realistic desk, fluid simulation, or fabricated UI;
- all essential copy stays in semantic DOM;
- visible concept label remains present.

Next.js boundary:

- server component owns section copy, stage list, accessible description, and DOM/SVG fallback;
- a small Client Component owns the dynamic import;
- use `ssr: false` only inside that Client Component;
- load shortly before the workflow section, not in the hero bundle;
- preserve layout dimensions before activation.

Performance:

- cap DPR at `min(devicePixelRatio, 1.5)`;
- use simple geometry/materials;
- no shadows, post-processing, environment maps, or large textures;
- render on progress/state change instead of an unconditional full-speed loop;
- pause offscreen and while `document.hidden`;
- dispose renderer, geometry, material, observers, listeners, and GSAP resources.
</gsap-three-contract>

<responsive-fallbacks>
Desktop first:
- tune common 1280 and 1440 laptop widths;
- hero headline stays within three lines;
- exact hero remains readable.

Tablet:
- reduce layers and depth;
- move copy above/below the stage when needed;
- preserve all five beats.

Mobile:
- replace the pin with five stacked normal-flow states;
- do not run the full WebGL scene by default;
- keep the hero proof on its static final phase;
- no hover dependency;
- no horizontal overflow at 320px.

Reduced motion:
- remove pinning, camera travel, and large spatial movement;
- show all five states as static normal-flow content;
- keep the hero static;
- update if the preference changes while the page is open.

No WebGL/load failure:
- show the server-rendered DOM/SVG fallback with the full narrative;
- never leave a blank canvas or loading hole.

JavaScript disabled:
- core headings, explanation, proof frame, stage copy, CTA, audience, FAQ content, and footer remain meaningful.
</responsive-fallbacks>

<accessibility>
Required:

- semantic landmarks and heading order;
- skip link;
- accessible mobile navigation;
- real links and buttons;
- visible `:focus-visible` states;
- accessible FAQ controls;
- strong contrast;
- no information conveyed by color alone;
- decorative canvas hidden from the accessibility tree while semantic fallback remains;
- no private fixture data;
- explicit aspect ratios to prevent layout shift;
- no hydration errors or horizontal overflow contracts.
</accessibility>

<anti-aesthetic>
Do not use:

- dark carbon as the dominant page background;
- generic blue/purple gradients or auroras;
- fake browser chrome;
- generic dashboard mockups;
- glass-card grids;
- generic bento layouts;
- stock construction photography, hardhats, cranes, or skyline renders;
- glowing orbs, floating cubes, rotating buildings, particles, marquees, or logo clouds;
- gradient text;
- huge pills, huge radii, or ghost-card shadows;
- decorative motion that continues after scrolling stops;
- smooth-scroll libraries, wheel interception, or custom full-page scrollers;
- unsupported AI/BIM/takeoff/integration claims;
- generic copy such as `streamline your workflow`, `work smarter`, `seamless collaboration`, `powerful platform`, or `all in one`.
</anti-aesthetic>

<implementation-sequence>
Use this closed loop:

1. Discover current route, exact proof, claims, dependencies, and owned files.
2. Decide the checkpoint required above.
3. Implement the light desktop shell, header, hero, exact proof, and three-part strip.
4. Implement the complete static narrative and honest replacement slots before motion.
5. Implement the GSAP cost thread and client-only Three.js story.
6. Implement tablet, mobile, reduced-motion, no-WebGL, and accessibility branches.
7. Delete route-owned code made unused by coherent replacement.
8. Verify only the authorized static checks below, read their output, and fix in-scope failures.
9. Reconcile every acceptance criterion and stop only when no safe in-scope work remains.

Prefer deletion and existing utilities over new abstractions. Do not add dependencies.

Use Kimi subagents only if an isolated read-only exploration or planning slice materially improves quality. Keep one writer per file and integrate results in the main agent.
</implementation-sequence>

<validation-boundary>
Authorized for this task:

- source and diff inspection;
- `git diff --check`;
- scoped ESLint for touched landing files;
- repository TypeScript checking;
- static source scans for banned patterns, unsupported claims, and unused imports;
- plan-pack validator if plan artifacts are changed.

Not authorized unless the current user separately requests it in the implementation session:

- automated product tests;
- broad test suites;
- builds used as test gates;
- browser automation;
- screenshots;
- visual QA;
- Storybook;
- hosted proof;
- deployment.

If browser proof is not authorized, report it as a visual proof gap. Never claim an unrun check passed.
</validation-boundary>

<acceptance-criteria>
Do not declare completion until source/static evidence shows:

1. `/` is redesigned inside the current public shell and `/new` remains noindex/unchanged.
2. First viewport explains product, audience, and primary action.
3. Hero headline is at most three lines by authored desktop CSS intent; rendered line proof remains a gap if browser QA is not authorized.
4. Exact sanitized workspace remains the hero with truthful disclosure.
5. Fake browser dots, URL bar, frame, glow, and auroras are removed.
6. Later screenshot slots are neutral, labelled, and free of fabricated UI.
7. Three-part value strip remains.
8. Page is predominantly light/airy with brand-orange CTA/thread and limited glass.
9. One orange thread connects the complete narrative.
10. One GSAP timeline owns the five workflow stages and native scrolling remains authoritative.
11. Three.js is lazy, bounded, removable, and nonessential to meaning.
12. Mobile, reduced-motion, no-WebGL, and JavaScript-independent core states retain the narrative.
13. Semantics, focus, controls, contrast, and accessibility-tree boundaries are coherent.
14. No unsupported claim, fake customer proof, fake metric, AI, BIM, automated takeoff, integration, pricing, or availability statement is added.
15. No dependency, authenticated-product change, `/new` redesign, build gate, browser proof, or deployment is performed outside authorization.
16. Fresh static checks pass or exact gaps are reported.
</acceptance-criteria>

<final-handoff>
Return only a concise implementation report with:

1. Result.
2. Changed files and deleted route-owned code.
3. Exact hero proof used, including fixture/presentation provenance.
4. Every remaining screenshot slot and its required future route/state.
5. GSAP/Three behavior and desktop/mobile/reduced-motion/no-WebGL fallbacks.
6. Fresh static validation evidence.
7. Unrun browser/visual proof and any real remaining risk.
</final-handoff>

<context-preservation>
If the Kimi session compacts, preserve:

- exact hero proof contract;
- route target and `/new` boundary;
- approved copy;
- eight page chapters;
- five workflow stages;
- neutral screenshot-slot rule;
- GSAP ownership and Three.js fallback contract;
- changed-file list;
- remaining acceptance criteria and validation gaps.
</context-preservation>

## Kimi Runtime Note

Current Moonshot documentation positions `kimi-k3` as the flagship long-horizon model and `kimi-k2.7-code` as the dedicated coding model. Kimi Code does not publicly guarantee the model selected for every account/session. Use a configured supported model, do not claim its identity without inspecting the runtime, and do not pass unsupported API sampling/tool fields copied from another model.

