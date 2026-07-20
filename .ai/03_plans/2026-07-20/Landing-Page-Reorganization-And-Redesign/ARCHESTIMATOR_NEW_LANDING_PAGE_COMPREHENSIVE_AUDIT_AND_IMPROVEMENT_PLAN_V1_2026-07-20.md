# Archestimator `/new` Landing Page — Comprehensive Audit and Improvement Plan

**Version:** V1  
**Date:** 2026-07-20  
**Status:** Source-verified audit and redesign recommendation  
**Scope:** `http://localhost:3000/new` and the current landing implementation under `src/components/landing-new/`  
**Decision:** Preserve the core positioning and light editorial direction; reorganize the page around a shorter story, real product evidence, and one restrained semantic WebGL moment.

---

## Executive Verdict

The current landing page has a strong strategic foundation. The hero outcome — **“Build the estimate once. Present it clearly. Revise it without losing the story.”** — is specific, memorable, and aligned with the product's real workflow. The warm-white, graphite, and signal-orange direction is also a credible visual foundation for a precise, architectural construction product.

The page's main problem is not weak taste. It is **insufficient prioritization and insufficient separation between product truth and concept illustration**.

The implementation reproduces nearly the entire long-form creative brief: hero, problem, three benefits, connected proof, compounding cost knowledge, audience taxonomy, trust principles, six FAQs, final CTA, and footer. That produces roughly **nine major narrative sections, six FAQs, about 181 authored strings, and about 892 words of copy or fixture labels** before accounting for repeated navigation and responsive variants. Those figures are directional source counts rather than a rendered-page word count, but they accurately describe the information-density problem.

At the same time, the most important evidence — what the estimate workspace actually looks like, what a client actually sees, what decisions are actually available, and how revision context is actually retained — is represented by simplified or invented interface chrome. That creates a high-trust risk: the page appears to show software, but several representations do not match the current software.

### The target result

The redesigned page should let a first-time visitor understand, within five seconds:

1. **What Archestimator is:** an estimate-to-proposal workspace for construction teams.
2. **What it does:** builds structured estimates, turns them into clear client-facing proposals, and keeps feedback and revisions connected.
3. **Why it matters:** less rebuilding, clearer decisions, and a reusable body of cost knowledge.
4. **What is real today:** the actual estimate workspace, proposal/review experience, discussions, decisions, history, and Excel output.
5. **What to do next:** request early access.

### Stop condition for the redesign

The redesign is complete when:

- the page has one dominant product story and one primary CTA;
- all software-looking visuals are exact current product captures or explicitly labeled concepts;
- the first real product proof appears immediately after the hero;
- redundant sections and repeated claims are removed;
- the WebGL scene explains continuity of information and then settles;
- reduced-motion, mobile, and no-WebGL experiences retain the complete message;
- every current-capability claim is traceable to source or a verified product capture.

---

## Audit Method and Evidence Boundary

This audit reconciles four evidence layers:

1. The current `/new` route and landing source.
2. The actual estimate, client review, decision, discussion, and history interfaces in the repository.
3. The canonical product, brand, and creative-direction documents in this plan folder.
4. Current primary-source guidance and reference-site patterns for landing pages, WebGL, ScrollTrigger, motion, accessibility, and performance.

### Verification state

- **Source inspection:** completed.
- **Product-fidelity comparison:** completed against current repository interfaces.
- **External research:** completed using current official or first-party sources.
- **Browser, screenshot, responsive, contrast, and runtime animation inspection:** not run. The repository contract makes browser automation and visual QA user-controlled for the current task. Findings about rendered spacing, contrast ratios, touch behavior, scroll feel, and frame rate therefore remain source-informed rather than browser-proven.
- **Automated tests/build:** not run and not required for this audit artifact.

The absence of browser proof does not affect the central conclusion: the content structure and product-fidelity mismatches are directly observable in source.

---

## Canonical Product Truth

The page should be organized around the product that exists, not around a broad category story.

### Plain-language product definition

**Archestimator is an estimate-to-proposal workspace for construction teams. It helps them build structured estimates from reusable cost knowledge, present those costs clearly to clients, capture feedback and decisions in context, and revise without losing the trail.**

That sentence is more useful above the fold than “AEC workflow” language alone because it identifies:

- the product category;
- the primary user action;
- the client-facing output;
- the system's distinctive continuity;
- the business outcome.

### Current product capabilities that are safe to prove

The current product already supports a meaningful evidence story:

- hierarchical estimate organization and structured estimate rows;
- quantity, contingency, subtotal, adjustment, miscellaneous cost, and total calculations;
- reusable components, supplier variants, history, images, and attachments;
- proposal preview and published client proposals;
- Excel export;
- client discussions targeted to sections, charts, or rows;
- issue-wide review decisions including approve, request changes, and decline;
- estimate row activity and old/new snapshots;
- recipient sessions and publication events.

These capabilities are documented in the current corpus and visible in repository code. They are enough to support a convincing landing page without inventing metrics, customers, AI behavior, or a polished revision-comparison feature that does not yet exist.

### Current product boundaries that the page must respect

- Archestimator is pre-release and preparing for controlled early access.
- Complete revision comparison remains planned rather than fully current.
- “Approval,” “less rework,” and “easier revisions” are outcome claims that should be framed carefully until supported by user evidence.
- The system does not automatically replace professional estimating judgment.
- Broad role coverage is real as a market ambition, but the sharp opening workflow is estimate → proposal → feedback → revision → decision.

---

## What the Current Page Does Well

### 1. The hero headline is a strong starting point

The headline in `src/components/landing-new/landing-content.ts:25` is outcome-led, concrete, and structured around one connected sequence. It avoids generic “transform your workflow” language and names the actual behavioral arc.

**Recommendation:** keep it unless later message testing produces a clearly stronger result.

### 2. The visual palette is credible and differentiated

The landing defines a warm paper base, graphite ink, muted supporting text, hairline rules, and a restrained signal orange in `src/components/landing-new/new-landing.module.css:8`. This is consistent with the intended precise, architectural, understated brand. It avoids the dark-purple gradient and generic glass-card aesthetic common in AI-generated SaaS pages.

### 3. The core narrative is product-specific

“The Living Estimate,” “Cost Thread,” proposals, client comments, and revisions are materially more relevant than a generic dashboard collage or decorative globe. The conceptual frame is worth preserving.

### 4. The page avoids fabricated traction

There are no invented customer logos, unsupported usage metrics, fake testimonials, or inflated “AI-powered” claims. The fixture is presented as illustrative rather than as a real customer project.

### 5. The primary CTA is consistent

“Request early access” is repeated consistently in navigation, hero, and final CTA. This follows the one-page, one-action principle recommended by [Unbounce's landing-page copywriting guidance](https://unbounce.com/landing-page-copywriting/) and [landing-page optimization guidance](https://unbounce.com/101-landing-page-optimization-tips/).

### 6. The implementation contains meaningful accessibility foundations

- native headings and landmarks are used throughout `src/components/landing-new/NewLandingPage.tsx`;
- focus-visible treatment is defined in `src/components/landing-new/new-landing.module.css:50`;
- scene controls use native buttons, a labeled group, `aria-pressed`, and a live region in `src/components/landing-new/LivingEstimateControls.tsx:15`;
- FAQs use native disclosure behavior;
- reduced-motion behavior exists for the WebGL loader and motion system.

### 7. The WebGL implementation already has good progressive-enhancement instincts

The scene is dynamically loaded, checks WebGL2, provides a static poster, avoids loading the canvas on small screens, caps device pixel ratio, pauses when offscreen, and disposes resources. Those are valuable foundations to keep.

### 8. The current uncommitted sticky-proof direction is structurally better

`src/components/landing-new/ConnectedProductProof.tsx` moves toward one stable proof frame with changing narrative chapters. That is directionally correct. The problem is the payload inside that frame: it should be authentic product evidence rather than reconstructed product-like visuals.

---

## Impeccable Source-Evidence Scorecard

These scores assess the current source and content architecture. They are not a substitute for browser-based contrast, responsive, or runtime verification.

| Dimension | Score | Source-evidence assessment |
|---|---:|---|
| Accessibility | **3/4** | Strong semantics, native controls, visible focus, and reduced-motion paths. Browser proof is still needed for focus order, contrast, touch targets, and actual reduced-motion completeness. |
| Performance | **3/4** | One progressively enhanced canvas, lazy loading, DPR cap, offscreen pause, and resource cleanup. Continuous animation and blur still need runtime measurement. |
| Theming / visual system | **3/4** | Coherent paper/ink/orange system and disciplined tokens. Repeated white/alternate bands and small media scale weaken the premium editorial hierarchy. |
| Responsive design | **2/4** | Explicit breakpoints and mobile poster exist, but the dense page and many sections are likely to remain long and cognitively heavy on mobile. No browser proof was run. |
| Anti-pattern resistance | **1/4** | Product-specific copy helps, but the implementation contains AI-nav composition, a three-equal-card feature row, universal fade-up reveals, repeated eyebrows, and invented UI chrome. |
| **Total** | **12/20** | A credible foundation that needs structural simplification and a strict product-fidelity correction before polish. |

---

## Hallmark Finding Summary

**4 critical · 11 major · 6 minor**

The count reflects product-trust and comprehension severity, not implementation effort.

---

## Critical Findings

### C1. Simulated UI is presented where authentic product proof is required

**Tell:** Product-like panels contain browser chrome, estimate tables, proposal cards, client responses, and revision states that read as screenshots or faithful UI demonstrations.

**Where:** `src/components/landing-new/NewLandingPage.tsx:278`, `src/components/landing-new/EstimateFixtureSheet.tsx:4`, and the proof chapters beginning at `src/components/landing-new/NewLandingPage.tsx:425`.

**Severity:** Critical — product trust and truthfulness.

**Why it matters:** The creative brief explicitly requires current, sanitized product visuals and forbids invented product chrome. The implementation occupies the most dangerous middle ground: too interface-like to be read as abstract art, but too inaccurate to be product proof.

**Fix:** Replace every software-looking proof visual with a sanitized current capture. If a visual is conceptual, remove all browser/window chrome, buttons, labels, and table structures that imply current UI. Label ambiguous concept work “Concept illustration.”

### C2. The landing estimate table does not match the current estimate workspace

**Tell:** The landing fixture reduces the estimate to Item, Qty, Unit cost, Contingency, and Total, and adds provenance or revision cues that are not presented that way in the actual table.

**Where:** `src/components/landing-new/EstimateFixtureSheet.tsx` and fixture data beginning at `src/components/landing-new/landing-content.ts:104`.

**Severity:** Critical — factual product fidelity.

**Evidence:** The actual table exposes Materials, Qty, Contingency, Subtotal, Adjustment, Misc Cost, and Total Item Cost in `src/components/workshop/estimate-sheet/rows/row-table.tsx:1223`. The actual calculation semantics are documented in `src/components/workshop/estimate-sheet/rows/row-table.tsx:161`.

**Fix:** Capture the actual estimate workspace at a curated viewport and fixture state. Crop or zoom the real interface rather than redrawing it. If simplification is necessary for legibility, crop columns; do not rename, recombine, or invent them.

### C3. The client-response and revision visuals imply behavior that differs from the current product

**Tell:** The landing response visual uses “Comment,” “Request changes,” and “Accept,” and its surrounding composition can imply that the decision applies to the selected line. The revision visual presents a polished revision-ghost comparison as though it were current UI.

**Where:** response and revision rendering in `src/components/landing-new/NewLandingPage.tsx:278` and chapter copy in `src/components/landing-new/landing-content.ts:211`.

**Severity:** Critical — workflow fidelity.

**Evidence:** The actual formal choices are Approve, Request changes, and Decline, and the decision explicitly applies to the whole issued scope, not an individual row, in `src/components/client-portal/ClientPortalDecisionSection.tsx:8` and `src/components/client-portal/ClientPortalDecisionSection.tsx:49`. Row-targeted discussion is real, but it is distinct from the issue-wide decision. Complete revision comparison remains planned.

**Fix:** Show a real row-targeted discussion capture and a separate real issue-wide decision capture. Show actual history/activity for revisions. Do not present a synthetic side-by-side revision experience until that interface exists.

### C4. Five-second comprehension is weakened by delayed literal product definition

**Tell:** The hero communicates the outcome but requires the visitor to infer what kind of software Archestimator is and what they will actually do inside it.

**Where:** hero copy in `src/components/landing-new/landing-content.ts:23` and hero rendering at `src/components/landing-new/NewLandingPage.tsx:104`.

**Severity:** Critical — conversion and message clarity.

**Fix:** Keep the current headline, but add a shorter literal definition immediately before or after it: **“An estimate-to-proposal workspace built around your construction cost knowledge.”** Follow with one concise sentence naming estimate, proposal, feedback, and revision. Expand “AEC” into plain construction language near first use.

---

## Major Findings

### M1. The page implements the brief as a checklist instead of a hierarchy

**Tell:** Nearly every planned section is present, even when adjacent sections make the same argument.

**Where:** sections begin at `src/components/landing-new/NewLandingPage.tsx:104`, `:166`, `:256`, `:425`, `:469`, `:500`, `:544`, `:567`, and `:587`.

**Severity:** Major — cognitive load.

**Fix:** Reduce the body to three proof-bearing chapters plus trust/status and CTA. The brief is source material, not a requirement to publish every idea.

### M2. The argument repeats without gaining specificity

**Tell:** The problem, benefits, connected proof, cost-knowledge loop, and final CTA repeatedly restate “keep cost context connected.”

**Where:** `landing-content.ts:39`, `:57`, `:211`, `:251`, and `:357`.

**Severity:** Major — comprehension and scroll fatigue.

**Fix:** Make each section answer a different question: What is it? How does it work? What does the real product look like? Why is the cost library different? Why trust it now?

### M3. Real product proof arrives too late

**Tell:** Visitors pass the problem narrative and a three-panel benefits section before reaching the main proof section — and that proof is simulated.

**Where:** `NewLandingPage.tsx:166` through `:425`.

**Severity:** Major — credibility.

**Fix:** Place the first authentic estimate-workspace capture immediately below the hero. Treat it as the primary visual anchor, not a late supporting section.

### M4. The three-equal-benefit-panel pattern reads as template-generated

**Tell:** Three equally weighted cards sit in a balanced grid under a centered section introduction.

**Where:** `NewLandingPage.tsx:256` and `.benefitGrid` in `new-landing.module.css:864`.

**Severity:** Major — Hallmark structural fingerprint.

**Fix:** Replace the grid with one asymmetric workflow story or fold each benefit into the relevant real-product proof chapter.

### M5. Navigation follows the generic AI-SaaS pattern

**Tell:** Logo left, multiple center links, sign-in and pill CTA right, with a translucent blur state on scroll.

**Where:** `NewLandingPage.tsx:53` and `new-landing.module.css:82`.

**Severity:** Major — brand distinctiveness.

**Fix:** Use fewer anchors: Product, How it works, Early access. Keep Sign in visually quiet and make the single CTA dominant without overusing pill styling or blur.

### M6. Universal fade-up reveals turn motion into a site-wide effect

**Tell:** Most sections and cards carry `data-reveal`, and one global motion layer applies similar entrance behavior.

**Where:** repeated across `NewLandingPage.tsx`, including `:168`, `:263`, `:432`, `:471`, `:527`, `:546`, `:569`, and `:605`; implementation in `src/components/landing-new/NewLandingMotion.tsx:34`.

**Severity:** Major — motion sameness and AI-generated feel.

**Fix:** Remove routine reveal animation from body copy and cards. Reserve scroll-driven motion for the one connected-product narrative where state change conveys meaning.

### M7. The WebGL scene is relevant but visually too abstract to carry product claims

**Tell:** Twelve box-like row plates, a proposal plane, a comment pin, and a revision ghost stand in for a complex construction workflow.

**Where:** `src/components/landing-new/LivingEstimateScene.tsx:131` and geometry/state definitions in `src/components/landing-new/living-estimate-model.ts:121`.

**Severity:** Major — comprehension and fidelity.

**Fix:** Reframe it explicitly as a semantic brand sculpture. Let it communicate one idea only: the same cost information changes form without losing continuity. Do not use it as evidence of exact product behavior.

### M8. The hero motion does not fully settle

**Tell:** The scene uses a continuous render loop while visible, pointer parallax, and `back.out` easing that creates a spring-like response.

**Where:** `LivingEstimateScene.tsx:332` and `:428`.

**Severity:** Major — calm, premium motion and performance.

**Fix:** Use a finite assembly timeline, end in a stable state, and render on demand after settling except for intentional interaction. Replace bounce-like easing with restrained cubic or power easing. Keep pointer response extremely small or remove it.

### M9. Broad audience taxonomy dilutes the opening wedge

**Tell:** Fifteen role or responsibility labels attempt to prove relevance to everyone.

**Where:** `landing-content.ts:267` and `NewLandingPage.tsx:500`.

**Severity:** Major — positioning.

**Fix:** Replace with one concise sentence: **“For the people who build the number, manage the work, and decide what moves forward.”** Move detailed role coverage to a separate use-cases page or later sales material.

### M10. Trust and FAQ duplicate positioning, product boundaries, and availability

**Tell:** Trust principles explain data ownership, user control, familiar outputs, and status; the FAQ repeats what the product is, who it is for, Excel, client review, automation limits, and availability.

**Where:** `landing-content.ts:298` and `:322`.

**Severity:** Major — copy overload.

**Fix:** Combine product status, data control, and Excel into one compact trust strip. Keep at most three FAQs that resolve high-intent objections not answered elsewhere.

### M11. The hero's media-to-copy scale feels underpowered in source

**Tell:** The CSS intentionally caps the hero heading at 48px while using large page gutters and section spacing.

**Where:** comment and tokens in `new-landing.module.css:1`; hero title rules begin near `new-landing.module.css:449`.

**Severity:** Major — visual hierarchy.

**Fix:** Increase editorial scale and reduce competing body copy rather than filling whitespace with more cards. Use one larger authentic product crop and a stronger asymmetrical composition. Confirm final sizing in-browser before locking values.

---

## Minor Findings

### N1. Repeated eyebrows dilute their signaling value

“The handoff problem,” “Work that compounds,” and other eyebrow labels become a repeated template device. Use eyebrows only when they add category or orientation information.

### N2. “AEC” is efficient for insiders but weak as the only category explanation

Retain it for SEO or secondary language, but pair it with “construction estimating” and the literal estimate-to-proposal definition.

### N3. “Simpler to approve” is a careful claim

The promise may be directionally true, but approval is a formal workflow with role and issue-level constraints. Keep the hero direction if desired, but support it with “easier to review and act on” until user evidence validates the stronger outcome.

### N4. The Cost Thread appears often enough to become a motif rather than evidence

Use the orange line once as the connective device through the hero/proof narrative. Repeating the metaphor in multiple sections weakens it.

### N5. The large footer and repeated links may compete with the completed CTA

After the final early-access action, keep the footer utility-oriented and quiet.

### N6. Source comments overstate the fidelity of the fixture

`EstimateFixtureSheet.tsx` describes the visualization as reflecting the canonical cost model. That statement should be removed or corrected when implementation begins, because the current columns and behaviors are not canonical product UI.

---

## Copy and Information-Architecture Audit

### Hero

**Keep**

- “Build the estimate once. Present it clearly. Revise it without losing the story.”
- “Request early access.”
- The idea that the estimate remains connected through proposal, review, and revision.

**Change**

- Add a literal category sentence.
- Shorten the supporting paragraph to one job, one mechanism, one outcome.
- Remove any claim the 3D model cannot prove.

**Recommended hierarchy**

> Construction estimate-to-proposal workspace  
> **Build the estimate once. Present it clearly. Revise it without losing the story.**  
> Structure project costs from your own reusable cost knowledge, send a clear client proposal, and keep feedback and revisions connected.  
> **Request early access**

### Problem section

The current handoff diagnosis is accurate but too long relative to what the visitor already inferred from the hero. Keep one concise contrast, then prove it visually.

**Recommended compression:**

> Spreadsheets, PDFs, email threads, and revised files split one cost decision into separate records. Archestimator keeps the estimate, proposal, feedback, and revision connected.

### Benefits section

Delete it as a standalone three-card row. Its three benefits are useful, but each should become the outcome label for a real product chapter:

- **Build once** → actual estimate workspace.
- **Present clearly** → actual proposal / Excel artifact.
- **Revise with context** → actual discussion, decision, and activity history.

### Product proof

This should become the center of the page. Use short captions, not explanatory paragraphs. The interface should do most of the work.

### Cost knowledge

Keep this as the primary differentiator after the workflow proof. The point is not another loop diagram; it is that reusable components, supplier information, variants, history, and attachments make future estimates faster and more consistent.

### Audience

Delete the detailed taxonomy from the homepage. It demonstrates breadth at the cost of sharpness. Use one line or three responsibility groups at most.

### Trust and status

Compress into a compact, factual strip:

- Your inputs and decisions remain under your control.
- Excel remains available as a familiar output.
- Archestimator is a pre-release product entering controlled early access.

Avoid vague privacy superlatives until the exact policy language is aligned.

### FAQ

Keep only objections that are not already answered:

1. Does Archestimator replace Excel?
2. Does it generate estimates automatically?
3. Is it available now?

The product definition, audience, and client review questions should be answered in the main narrative, not hidden in FAQs.

---

## Product-Fidelity Matrix

| Landing representation | Actual product truth | Risk | Required disposition |
|---|---|---|---|
| Simplified five-column estimate sheet | Actual workspace uses Materials, Qty, Contingency, Subtotal, Adjustment, Misc Cost, and Total Item Cost | High | Replace with exact current capture; crop rather than redraw |
| Inline source/revision marks inside the fixture | Provenance and activity exist, but not in the exact represented chrome | High | Show actual history/activity separately or label as concept |
| “Accept” client action | Formal current action is “Approve”; “Decline” also exists | High | Use exact current labels |
| Response shown near one line | Row discussions are real; formal decisions apply to the whole issue | High | Separate discussion proof from decision proof |
| Polished revision ghost/comparison | Activity/history exists; complete revision comparison remains planned | High | Show current activity/history; do not imply complete comparison |
| Proposal plane / browser-like card | Published client proposal exists, but the synthetic card is not its exact UI | High | Use sanitized `/share/[token]` capture |
| Cost Thread sculpture | Conceptual representation of continuity | Acceptable if explicit | Keep abstract; remove UI-like claims and label when ambiguous |
| Illustrative project data | Fixture, not customer data | Acceptable | Continue labeling as illustrative; never imply a customer |

---

## Visual Direction

### Preserve

- light warm-white foundation;
- graphite typography and hairlines;
- orange as a single connective signal;
- editorial asymmetry;
- construction-cost-specific language;
- one semantic 3D object;
- a restrained, technical, calm personality.

### Increase

- scale of the primary visual anchor;
- contrast between narrative chapters;
- actual product surface area;
- meaningful cropping and annotation;
- large type used sparingly;
- negative space around proof, not around filler copy.

### Reduce

- cards;
- repeated section headers and eyebrows;
- body-copy volume;
- repeated Cost Thread references;
- universal reveal animation;
- fake chrome;
- equal three-column layouts;
- generic blur and pill treatment;
- continuous movement.

### The key design principle

**The page is not visually empty because it lacks words. It is visually empty because too little of the available space is occupied by meaningful, authentic product evidence.**

The solution is fewer, larger, better-authenticated media anchors — not more copy or more decoration.

---

## Authentic Visual System

Every landing visual should belong to exactly one class.

### 1. Current product proof

An exact capture of the current software.

Allowed edits:

- crop;
- redact sensitive data;
- adjust fixture content before capture;
- add an external annotation layer that does not alter interface behavior;
- place in a simple editorial frame.

Not allowed:

- renaming controls;
- changing column structure;
- combining separate workflows into one fictional screen;
- adding features that are not present;
- redrawing the interface for aesthetic consistency.

### 2. Product artifact

A real output created by the product: Excel export, proposal, activity record, or share issue. It must come from a controlled fixture and be reproducible.

### 3. Concept illustration

An abstract explanation of an idea. It must not mimic software chrome. If a reasonable visitor could mistake it for a screenshot, label it **“Concept illustration.”**

### 4. Placeholder

An internal-only production marker. It must never ship publicly and should name the exact required route, state, viewport, and fixture.

### Capture provenance record

Store a small sidecar manifest for every approved product image:

- route;
- source commit SHA;
- fixture or seeded record ID;
- viewport;
- capture date;
- owner;
- crop description;
- redactions;
- annotations;
- product-version expiration or recapture trigger.

This is the practical mechanism for keeping the user's **100% accuracy** requirement true as the product changes.

---

## Current Reference-Site Research

The strongest modern product sites do not share one visual style. They share one discipline: **their motion and imagery are native to what the product actually does.**

### Linear

[Linear's current homepage](https://linear.app/homepage) puts recognizable product UI and concrete work objects near the top of the page. Its design refresh also emphasizes not competing for attention before attention has been earned in [Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh).

**Lesson for Archestimator:** bring real interface proof forward. Earn the right to tell the broader workflow story after the visitor can see the product.

### Spline

[Spline](https://spline.design/) can make interactive 3D the proof because interactive 3D is the product. Its states, events, and timelines demonstrate its core capability directly.

**Lesson for Archestimator:** do not imitate orbiting-object spectacle. Use 3D only where it clarifies the cost-information lifecycle; use the actual application to prove estimating software.

### Rive

[Rive](https://rive.app/) presents state-driven interactive graphics and the principle that what creators build is what ships.

**Lesson for Archestimator:** state transitions are valuable when they demonstrate a real model. The Living Estimate should move between a few meaningful states, not animate continuously for ambiance.

### Stripe

[Stripe](https://stripe.com/) opens with a clear category and outcome, then supports breadth with concrete interfaces, artifacts, and verified proof.

**Lesson for Archestimator:** explain the category literally before expanding the vision. Do not copy Stripe's metric-led proof until Archestimator has verified user evidence.

### Vercel

[Vercel](https://vercel.com/) uses deployment, terminal, preview, and infrastructure artifacts that reflect its actual product primitives.

**Lesson for Archestimator:** construction cost rows, proposal issues, comments, decisions, activity, and Excel output are the native primitives. Those should shape the page's visuals.

### Research synthesis

Archestimator should not become a “3D website.” It should become a product-specific landing page with:

- one distinctive semantic WebGL scene;
- one high-confidence sticky product story;
- large real product captures;
- a short, literal message hierarchy;
- motion that explains state instead of decorating scroll.

---

## WebGL and ScrollTrigger Direction

### Recommended concept: semantic sculpture plus authentic proof

Keep a refined version of **The Living Estimate** as the hero's abstract brand object. It should depict layers of cost information resolving into one connected structure, with the orange Cost Thread passing through each state.

Then use real software captures for proof. This division is clear and honest:

- **3D answers:** “What is the idea?”
- **product captures answer:** “What does the software actually do?”

### Two alternatives

#### Alternative A — real captures in shallow 3D space

Use exact screenshot textures on flat planes and move them subtly in Z-space as the story changes. This preserves fidelity but introduces texture-resolution, accessibility, and performance risk. It is viable only if the DOM retains the same content and the canvas is enhancement rather than the only proof.

#### Alternative B — full 3D reconstruction of the interface

Reject. It would be expensive to maintain, quickly become stale, reduce text clarity, and almost guarantee product-fidelity drift.

### Scroll narrative

Use one scrollytelling sequence with four discrete chapters:

1. **Build** — the real estimate workspace is visible.
2. **Present** — the current proposal or Excel artifact replaces or overlays it.
3. **Respond** — a real targeted discussion and issue-wide decision appear.
4. **Revise** — actual activity/history shows what changed and why.

The orange thread can travel through the frame as a DOM/SVG annotation, while the screenshot changes are simple crossfades, clips, or transforms.

### GSAP architecture

[GSAP's ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) supports a single timeline controlled by one ScrollTrigger and documents pinning behavior and `anticipatePin` for repaint-related pin flashes.

Recommended implementation:

- one timeline for the connected-product story;
- native document scroll;
- one sticky or pinned proof frame;
- three or four labeled chapters;
- transform, opacity, and clip-based transitions;
- desktop enhancement through `gsap.matchMedia()`;
- `invalidateOnRefresh: true` and a dynamic end distance;
- conservative `anticipatePin` only if measured necessary;
- a static vertical sequence on mobile and reduced-motion modes;
- no scroll hijacking, wheel interception, snap takeover, or Observer-based pseudo-scroll.

### Motion rules

- Hero assembles once and settles.
- Product proof changes only at chapter boundaries.
- Motion duration remains short and controlled.
- Use ease-out curves without bounce or elastic overshoot.
- Animate `transform` and `opacity` where possible, consistent with [Google's runtime animation guidance](https://developers.google.com/web/shows/cds/2014/the-applied-science-of-runtime-performance).
- Do not animate every paragraph, card, and section.
- Do not use infinite rotation, floating particles, mouse followers, or decorative parallax.

### Reduced motion

[web.dev's reduced-motion guidance](https://web.dev/articles/prefers-reduced-motion) recommends removing non-essential motion and responding to the media query in both CSS and JavaScript.

The reduced-motion experience should:

- render the final hero composition immediately;
- show all four proof chapters as a normal static stack;
- preserve annotations and captions;
- avoid pinned motion and animated camera transitions;
- listen for preference changes during the session.

### Performance budget and behavior

[web.dev's LCP guidance](https://web.dev/articles/lcp) defines a good Largest Contentful Paint as **2.5 seconds or less at the 75th percentile**. The hero's text or poster is likely to be the LCP candidate, so the canvas must not block it.

Required constraints:

- server-render hero text and static poster;
- dynamically import Three.js after essential content;
- one canvas maximum;
- no WebGL requirement for reading any claim;
- cap device pixel ratio;
- stop rendering when settled, offscreen, or tab-hidden;
- restore gracefully after context loss;
- preserve the mobile poster or static illustration;
- measure bundle impact and real-device frame time before release.

### The 3D admission test

**If removing the 3D object does not reduce understanding of how cost information stays connected, remove it.**

---

## Recommended Page Architecture

### 1. Minimal navigation

**Content:** Logo, Product, How it works, Sign in, Request early access.  
**Purpose:** orientation and one conversion action.  
**Motion:** transparent-to-solid only if needed; avoid heavy blur.

### 2. Hero — outcome plus literal definition

**Left:** category, current headline, one short subhead, CTA.  
**Right:** finite semantic Living Estimate sculpture.  
**Immediately below:** a visible edge or preview of the real estimate workspace so the product proof is not delayed.

### 3. Connected product proof — the page's centerpiece

**Structure:** sticky real product frame with three or four short chapters.  
**Assets:** current estimate, current proposal/Excel artifact, current discussion/decision, current activity/history.  
**Copy:** one outcome heading and one sentence per chapter.  
**Motion:** one ScrollTrigger timeline on desktop, static stack on mobile/reduced motion.

### 4. Reusable cost knowledge — the differentiator

**Structure:** one asymmetrical split.  
**Asset:** exact component/library interface crop with supplier/variant/history evidence.  
**Copy:** explain how completed work makes the next estimate easier without claiming automatic estimation.

### 5. Trust and early-access status

**Structure:** compact factual strip, not four cards.  
**Content:** user control, familiar Excel output, pre-release status, founder context if valuable.  
**Avoid:** unverified security/privacy superlatives.

### 6. Focused FAQ

Three native disclosure items only: Excel, automation, availability.

### 7. Final CTA

One statement, one early-access action, quiet footer.

### Sections to delete or fold

- standalone handoff-fragment animation;
- three-panel benefits grid;
- separate long-form audience taxonomy;
- four-card trust grid;
- repeated cost-knowledge loop if the real library proof covers it;
- FAQ items already answered above;
- repeated final restatement of the entire workflow.

---

## Proposed Visual Asset Set

### Asset 01 — estimate workspace

- **Route:** current workshop estimate route.
- **State:** one realistic project with groups/areas and a populated row table.
- **Must show:** actual columns, structure, totals, and enough surrounding application context to be identifiable.
- **Purpose:** prove “Build the estimate once.”

### Asset 02 — client-facing proposal

- **Route:** current published share route.
- **State:** sanitized issued proposal with estimate summary and client review context.
- **Must show:** exact current client-facing chrome.
- **Purpose:** prove “Present it clearly.”

### Asset 03 — discussion and decision

- **Route:** current client portal.
- **State:** one targeted discussion plus the separate issue-wide decision area.
- **Must show:** exact labels Approve, Request changes, Decline; avoid implying row-level formal approval.
- **Purpose:** prove contextual feedback and action.

### Asset 04 — revision trail

- **Route:** current estimate activity/history surface.
- **State:** a real changed line with old/new snapshot and reason or activity context if current.
- **Must show:** only current history behavior.
- **Purpose:** prove “Revise it without losing the story.”

### Asset 05 — reusable cost knowledge

- **Route:** current component/library surface.
- **State:** a representative component with variant, supplier, history, image, or attachment evidence.
- **Purpose:** prove the differentiator.

### Asset 06 — Excel artifact

- **Source:** actual product export generated from the same fixture.
- **Purpose:** demonstrate that familiar downstream output remains available.

---

## Prioritized Implementation Plan

### P0 — restore product truth before further polish

1. Build a sanctioned landing fixture using current product routes and data shapes.
2. Capture the five exact current product surfaces listed above.
3. Create capture provenance records.
4. Replace the landing estimate, proposal, response, and revision reconstructions.
5. Correct all decision labels and distinguish row discussion from issue-wide decision.
6. Remove or clearly label any remaining concept interface.
7. Reconcile every capability claim against the current corpus and source.

**Primary files likely affected:**

- `src/components/landing-new/NewLandingPage.tsx`
- `src/components/landing-new/landing-content.ts`
- `src/components/landing-new/EstimateFixtureSheet.tsx`
- `src/components/landing-new/ConnectedProductProof.tsx`
- `src/components/landing-new/new-landing.module.css`
- new static assets and provenance manifest under the repository's established public-asset convention

### P1 — simplify the narrative

1. Add the literal product definition to the hero.
2. Move authentic proof directly below the hero.
3. Fold benefits into the proof chapters.
4. Replace the audience taxonomy with one responsibility-based line.
5. Merge trust/status and reduce FAQ to three items.
6. Reduce navigation anchors and quiet the footer.
7. Remove repeated eyebrows and duplicate Cost Thread language.

### P1 — make motion semantic

1. Convert the hero to a finite assembly-and-settle sequence.
2. Remove bounce easing and continuous ambient movement.
3. Remove universal `data-reveal` behavior from routine content.
4. Use one ScrollTrigger-controlled product-proof timeline.
5. Preserve static mobile and reduced-motion sequences.
6. Stop render loops when settled, hidden, or offscreen.

### P2 — premium visual refinement

1. Increase hero and product-proof scale after the copy is reduced.
2. Replace repeated equal grids with asymmetric editorial compositions.
3. Refine annotation language and orange-thread behavior.
4. Tune typography, line length, sticky distance, and chapter pacing in-browser.
5. Validate contrast, focus order, touch targets, breakpoint behavior, and real-device performance.

---

## Implementation Guardrails

### Do

- use current software captures as the source of truth;
- keep the existing hero headline as the default starting point;
- state what the product is in plain language;
- make one section carry the product story;
- use 3D as concept illustration, not product evidence;
- make every chapter more specific than the previous one;
- use calm, finite, reversible motion;
- keep the page fully understandable without JavaScript or WebGL;
- keep early-access status explicit;
- preserve Excel as an output rather than positioning it as an enemy.

### Do not

- publish redrawn or fictional software chrome;
- imply complete revision comparison before it exists;
- imply row-level formal approval;
- invent customers, metrics, endorsements, or automation;
- add another three-card feature grid;
- animate every section on entry;
- hijack scrolling or use snap-based pseudo-navigation;
- add decorative particles, infinite rotation, mouse followers, or floating orbs;
- use a second canvas;
- solve visual emptiness with more copy;
- broaden the hero into a list of every construction role;
- introduce new dependencies unless a current tool cannot meet a verified requirement.

---

## Acceptance Criteria

### Message

- A visitor can identify “construction estimate-to-proposal workspace” without scrolling.
- The existing outcome headline remains prominent.
- One supporting paragraph explains estimate, proposal, feedback, and revision.
- The page has one primary CTA label.
- No section repeats another section's job.

### Product truth

- Every software-looking visual matches the current product exactly.
- Every visual has a provenance record.
- Current action labels and scope are accurate.
- Planned capabilities are not presented as current.
- Concept visuals are unmistakably abstract or explicitly labeled.

### Visual hierarchy

- The first authentic product proof appears at or immediately after the hero.
- The product-proof frame is the largest body visual.
- No equal three-card feature row remains.
- Orange is reserved for continuity, state, or action.
- Section count and authored copy are materially reduced from the current page.

### Motion

- One primary ScrollTrigger story exists; routine copy does not universally reveal.
- Hero motion is finite and settles.
- No bounce, elastic, scroll hijack, or infinite ornamental motion remains.
- Reduced-motion users receive the complete static narrative.
- Mobile receives a readable static or lightly enhanced sequence.

### Performance and accessibility

- Hero text and poster are server-rendered.
- WebGL is optional and dynamically loaded.
- One canvas maximum is used.
- Canvas rendering pauses when settled, offscreen, or hidden.
- LCP, contrast, keyboard flow, touch targets, and real-device motion are measured during implementation validation.

---

## Founder Review Checklist

Review the next version in this order:

1. Can I explain what this is after five seconds?
2. Is the first screen specific to Archestimator rather than generic SaaS?
3. Does every product visual match the current software?
4. Is the 3D scene clearly a concept rather than a screenshot?
5. Does every scroll chapter reveal new evidence?
6. Can any paragraph, card, or section be deleted without losing meaning?
7. Does the page feel calm and exact rather than busy or theatrical?
8. Does the client-response story distinguish discussion from formal decision?
9. Is early-access status honest and visible?
10. Is the CTA obvious without being repeated as visual noise?

---

## Remaining Risks and Required Follow-Up Evidence

### Browser proof still required during implementation

- actual above-the-fold composition at common desktop and mobile widths;
- text contrast over every surface;
- sticky/pinned chapter pacing;
- keyboard order and focus visibility;
- touch target size and disclosure usability;
- reduced-motion behavior after preference changes;
- WebGL context-loss recovery;
- frame rate on representative integrated-GPU hardware;
- LCP, CLS, and interaction responsiveness;
- asset readability after responsive cropping.

### Product-proof maintenance risk

Authentic screenshots can become stale as quickly as code changes. The provenance manifest and a recapture trigger are therefore part of the design system, not optional documentation.

### Claim-evidence risk

The current page is disciplined about metrics but still uses outcome language that should be validated through early-access research. The highest-priority claims to test are:

- less rework;
- clearer proposals;
- easier or simpler approval;
- easier revisions;
- compounding value from reusable cost knowledge.

Until evidence exists, keep the copy concrete and mechanism-led.

---

## Final Recommendation

Do not discard the current direction. **Edit it down and make it more truthful.**

The strongest version of the Archestimator landing page is not a denser YC/A16Z-style manifesto and not a spectacle-first WebGL site. It is a precise product story:

1. a strong existing outcome headline;
2. a literal product definition;
3. one memorable abstract Living Estimate sculpture;
4. immediate, exact current product proof;
5. a short connected workflow from estimate to decision;
6. one differentiated explanation of reusable cost knowledge;
7. honest status, three objections, and one CTA.

That combination can feel sleek, high-end, and technically sophisticated without sacrificing product clarity or trust.
