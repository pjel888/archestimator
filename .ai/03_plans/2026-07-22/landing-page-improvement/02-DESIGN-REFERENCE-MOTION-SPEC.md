# Design, Reference, and Motion Specification

## Creative Thesis

Archestimator should feel like a clear estimating workspace made visible in daylight.

A single orange cost thread carries scope, cost source, proposal, review, revision, and decision through the page. The thread is a navigational and causal device, not a decorative squiggle. Product truth stays primary; motion and material depth help the visitor understand continuity.

## Reference Synthesis

The first-party research in `research/REFERENCE-SITE-SYNTHESIS.md` supports this non-cloning blend:

| Reference | Transferable principle | Archestimator use |
| --- | --- | --- |
| Intercom | Sharp proposition followed by varied product-system proof. | One direct hero, then proof modules with different editorial rhythms. |
| Fathom | Domain credibility through native artifacts and clear content divisions. | Estimate, scope, cost-source, proposal, and decision artifacts replace generic construction imagery. |
| Mistral | Confident type hierarchy and modular platform narrative. | Large but controlled typography, simple navigation, no platform sprawl. |
| Rows | Narrow copy, small proof scenes, restrained purposeful interaction. | Alternating product-proof modules with short specific explanations. |
| Agentwork | Sparse three-step explanation and concrete examples. | Keep workflow explanation direct and avoid feature-grid bloat. |
| Taito.ai | Claim, literal app proof, why, workflow proof, credibility, conversion. | Use the structure, compress the length, and keep proof exact. |

Do not copy any reference's copy, assets, typography license, customer marks, distinctive component geometry, animation sequence, or information architecture verbatim.

## Visual System

### Palette

- **Canvas:** warm white or pale porcelain, not pure blue-white.
- **Primary text:** near-black ink.
- **Secondary text:** warm gray with sufficient contrast.
- **Rules and panels:** low-contrast neutral borders and paper-like surfaces.
- **Signal:** existing `--brand-orange` for primary CTA fills, active thread segments, and important focus states.
- **Contrast support:** existing darker orange token only where small text or focus contrast requires it.

The page remains predominantly light. A brief dark or deep-ink interlude is permitted only if it improves the central workflow transition and does not reset the overall daylight character.

### Typography

- Use the existing licensed project sans and mono stack.
- Hero headline: two or three lines at common laptop widths, clear rather than oversized.
- Body copy: short paragraphs with practical AEC vocabulary.
- Mono: only for real data, stage labels, or technical annotations.
- Avoid italic display type, gradient text, and an eyebrow above every section.

### Grid and spacing

- Desktop outer grid: wide, with a calm reading measure for copy and a large product-proof column.
- Use alternating editorial divisions rather than repeated equal cards.
- Section spacing should create chapters without empty cinematic padding.
- Hairlines, aligned baselines, and document edges provide structure.
- Product proof can exceed the copy column, but must remain legible on a common laptop viewport.

### Liquid-glass boundary

Borrow only the workshop's material hint:

- navigation may become a thin translucent surface after the hero crosses the viewport;
- small stage labels or foreground controls may use a quiet translucent plate;
- at most one blur layer per visual region;
- no nested blurred cards;
- no glass as the default section container;
- no huge frosted bubbles, neon refraction, or ornamental glass objects.

If glass is unavailable, the fallback is an opaque warm-white surface with the same border and hierarchy.

## Approved Copy Deck

Visible copy must use source-backed claims and avoid em dashes.

### Pre-release banner

- `Pre-release beta`
- `Request access: support@archestimator.com`

### Header

- Product
- Workflow
- FAQ
- Primary: `Request beta access`
- Signed in: `Open workspace`

### Hero

- Context: `Construction estimating, without the broken handoff.`
- Headline: `Build the estimate. Keep the context.`
- Support: `One connected workspace for AEC teams to structure estimates, reuse cost knowledge, present proposals, and keep reviews and revisions attached to the same commercial record.`
- Primary: `Request beta access`
- Secondary: `Follow the workflow`
- Note: `Built for the full estimate-to-proposal workflow.`
- Proof disclosure: `Sanitized Archestimator workspace demonstration`

### Three-part value strip

Preserve the current three strongest truths immediately after the hero:

1. `Structured around real scope`
2. `Excel stays in the workflow`
3. `Client review stays attached`

Each gets one short sentence from current source. Do not turn the strip into three floating glass cards.

### Problem

- Headline: `The number is only half the story.`
- Body: `Spreadsheets hold the estimate. PDFs hold the issue. Email and chat hold the questions. The next revision becomes another file. The number, its source, and the decision stop sharing the same record.`

### Workflow

- Headline: `Follow the number.`
- Intro: `One connected record from first scope to final decision.`
- Stages: `Structure`, `Reuse`, `Issue`, `Review`, `Revise`

### Connected record

- Headline: `What stays connected.`
- Pairs: cost/source note, component/supplier or variant, estimate/proposal, comment/proposal context, revision/changed value, decision/activity history.

### Audience

- Headline: `For teams that own the number.`
- Body: use the current AEC role list from `new-landing-content.ts` without fictional personas or portraits.

### Closing

- Headline: `Keep the estimate and decision connected.`
- Body: `Request beta access and bring the estimating or proposal handoff you want to improve.`
- CTA: `Request beta access`

### FAQ

Retain factual answers for:

- who Archestimator is for;
- whether it replaces Excel;
- what teams can save and reuse;
- client proposal review;
- pre-release availability.

The current answer about exact client review behavior must be tightened to what current source proves before implementation publishes it.

## Page Architecture

### 1. Compact header and exact-proof hero

- Keep the announcement, navigation, headline, support, primary CTA, and proof visible quickly.
- Use the exact sanitized workspace hero already present in the production root.
- Remove fake browser dots, URL bar, frame language, auroras, and decorative glow.
- Place the proof on a shallow paper/glass transition surface without masking real controls or text.
- Start the orange thread as a precise rule or tracked number beneath the hero copy.
- No WebGL dependency in the hero.

### 2. Three-part value strip

- Keep the three current truths in one horizontal editorial band on desktop.
- Use rules, aligned copy, and small source-backed icons only if they help scanning.
- Stack cleanly on mobile.

### 3. Broken handoff editorial chapter

- Show the estimate, proposal, question, and revision as native document fragments or text labels.
- The cost thread visibly separates across the fragments.
- This is conceptual, not product UI, and carries the visible concept label.
- Keep the chapter concise enough that the central workflow begins without delay.

### 4. Five-stage `Follow the number` story

This is the one cinematic section.

- Desktop: one pinned stage, five labelled beats, adjacent semantic copy.
- Tablet: shorter pin or sticky stage only when both copy and visual remain readable.
- Mobile/reduced motion: five stacked states with the same copy and static evidence.
- The orange thread remains continuous through every state.
- A Three.js scene may depict shallow document planes and an orange connection path. It must not resemble the Archestimator interface.
- A semantic DOM/SVG fallback is server-rendered before the client scene loads.

### 5. Focused product-proof modules

Use up to three alternating proof modules:

1. Scope and reusable cost context.
2. Proposal or spreadsheet output and review context.
3. Revision and activity history.

The hero remains the only product proof that must be live now. Each later module may initially use a neutral exact-capture slot under the placeholder contract in `01-CURRENT-STATE-AND-PROOF.md`. No fake UI is permitted.

### 6. Connected record matrix

- Present six relationships as a ledger, index, or ruled matrix.
- Avoid six equal cards.
- The orange thread can link the left and right sides of each relationship.
- If any row starts to resemble software, replace it with plain editorial structure or an exact capture.

### 7. Audience, beta status, and FAQ

- Keep roles compact and text-led.
- State pre-release status clearly.
- Do not expose allowlists, manual approval, or cohort operations.
- Use accessible FAQ details or current accordion primitives.

### 8. Final CTA and compact footer

- Resolve the orange thread into the CTA.
- Keep the CTA within the page grid, not as a detached oversized rounded banner.
- Preserve only current routes and contact information.

## GSAP Choreography

### Ownership

GSAP ScrollTrigger owns scroll progress. Three.js receives progress and stage information. Three.js never creates a second scroll container and never reads wheel/touch input directly.

### Master story timeline

Use one labelled timeline:

```text
structure -> reuse -> issue -> review -> revise
```

Recommended desktop behavior:

- pin only the story stage;
- use native document scrolling;
- use a restrained numeric scrub only if it improves legibility;
- no snap by default;
- animate transforms, opacity, SVG path progress, shallow camera position, and material emphasis;
- animate children, not the pinned element;
- ensure reverse scroll produces the same coherent states in reverse;
- stop all motion when scroll stops;
- refresh after fonts and proof media settle;
- clean up through `useGSAP`, `gsap.context`, and `gsap.matchMedia`.

### Stage behavior

1. **Structure:** unconnected scope fragments align into one ordered record.
2. **Reuse:** source notes, supplier/variant context, and saved costs attach to the relevant scope. Do not imply automated extraction.
3. **Issue:** a proposal or spreadsheet artifact separates visually while the orange thread keeps its source relationship.
4. **Review:** a comment and decision attach to proposal context. If conceptual, label it.
5. **Revise:** a changed value appears beside the earlier reviewed state and its reason.

### Non-cinematic motion

- Hero proof keeps its existing deterministic product sequence and pause behavior.
- Other sections receive one short entrance at most.
- No continuous marquee, ambient drift, particles, parallax, typewriter, or decorative loop.
- Navigation material change is a simple state transition, not a scroll effect showcase.

## Three.js/WebGL Contract

### Scene concept

Create one light, shallow `Connected Record` scene:

- five paper-like planes, edges, or typed data fragments;
- one orange curve or line that links them;
- a small depth shift and camera move tied to the five stages;
- no building, globe, orb, particle field, realistic desk scene, or decorative fluid simulation;
- no product controls or fabricated interface.

The scene is visibly captioned:

> Conceptual workflow visualization, not product interface

### Component boundary

- Server component owns section heading, copy, stage list, fallback, and accessible description.
- A small Client Component owns the `next/dynamic` import.
- The Three.js island uses `ssr: false` only inside that client boundary.
- Load shortly before the story approaches the viewport, not in the hero bundle.
- Preserve layout dimensions before load to avoid shift.

### Runtime budget

- cap DPR at `min(devicePixelRatio, 1.5)`;
- use simple geometry and materials;
- avoid shadows, post-processing, environment maps, and high-resolution textures;
- render on timeline/progress change rather than running an unconditional full-speed loop;
- pause when offscreen or `document.hidden`;
- dispose renderer, geometry, material, observers, and GSAP resources on unmount;
- respond to container resize without accumulating listeners or canvases;
- show the DOM/SVG fallback for no WebGL, load failure, reduced motion, and low-capability/mobile branches.

## Responsive and Accessibility Contract

### Desktop

- Design for 1280 to 1440px laptops first, not only ultra-wide screens.
- Headline is at most three lines.
- Exact hero proof is readable without browser chrome.
- Pinned copy never covers important proof or stage content.

### Tablet

- Reduce simultaneous depth and layers.
- Move stage copy above or below the visual when split layout becomes cramped.
- Preserve all five beats.

### Mobile

- Replace the long pin with five normal-flow states.
- Do not run the full WebGL scene by default.
- Keep the exact hero proof visible in its static final phase.
- No hover dependency.
- No horizontal overflow at 320px.
- Primary CTA remains one line where practical without shrinking below usable size.

### Reduced motion

- Remove pinning, long translations, and camera motion.
- Use the server-rendered stacked narrative and static fallback.
- The hero proof remains on its static final phase.
- No information exists only in an animation.
- Respond if the preference changes while the page is open.

### Accessibility

- semantic landmarks and heading order;
- skip link and accessible mobile navigation;
- real links/buttons with visible `:focus-visible` states;
- accessible FAQ controls;
- sufficient text and orange contrast;
- no information conveyed by color alone;
- decorative Three.js canvas hidden from the accessibility tree while the semantic fallback remains available;
- no private fixture data or unsupported product claims;
- core copy and CTA server-rendered.

## Performance and Degradation Contract

- Keep Three.js and story-specific GSAP code out of the initial hero path.
- Preserve explicit aspect ratios for hero and replacement slots.
- Avoid cumulative layout shift from fonts, proof, or WebGL activation.
- Keep the current hero proof's intersection and visibility pause behavior.
- No continuous offscreen rendering.
- No smooth-scroll library, wheel interception, or custom full-page scroller.
- Core story remains coherent with JavaScript disabled, WebGL unavailable, reduced motion enabled, and touch-only input.
- If the WebGL island competes with product proof, readability, or responsiveness, retain the DOM/SVG story and cut the canvas before weakening the page.

## Anti-Aesthetic

Do not use:

- generic blue/purple gradients or auroras;
- fake browser chrome;
- glass-card grids;
- generic bento layouts;
- stock construction photography, hardhats, cranes, or skyline renders;
- glowing orbs, rotating buildings, particles, marquees, or logo clouds;
- fake customer proof, awards, metrics, pricing, or compliance badges;
- generic dashboard imitations;
- gradient text, oversized pills, huge radii, or ghost-card shadows;
- filler copy such as `streamline your workflow`, `work smarter`, `seamless collaboration`, or `all in one`;
- any claim of AI, BIM, takeoff automation, or integration not proven by current source.

