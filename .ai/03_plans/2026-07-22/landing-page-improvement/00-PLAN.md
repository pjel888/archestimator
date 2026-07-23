# Archestimator Public-Root Landing Redesign Plan

## Status

- **Mode:** Plan Pack
- **Profile:** standard
- **Package:** `PLAN-2026-07-22-landing-page-improvement`
- **Implementation:** not started
- **First ready unit:** `UNIT-001`
- **Action ceiling:** `IMPLEMENT_LOCAL`
- **External deployment:** out of scope
- **Automated product testing/browser proof:** user-controlled boundary
- **Stop condition:** every accepted requirement and acceptance criterion is reconciled against fresh evidence; the hero remains exact product proof; later placeholders remain honest; fallback content is complete; static verification is green; and any unrun visual proposal is explicitly reported.

## Task Contract

### Target result

Rebuild `/` into a light, airy, direct, desktop-first public landing page with the current sanitized estimate workspace as the exact hero proof, restrained workshop-derived liquid-glass cues, a brand-orange continuity thread, and one purposeful GSAP/Three.js scroll story.

### Success criteria

1. The first viewport explains the product, audience, and conversion action.
2. The exact product workspace remains the hero; fake browser chrome and auroras do not.
3. Later product visuals are exact captures or visibly neutral replacement slots, never reconstructed UI.
4. The page is mostly light, uses orange as the single signal, and keeps glass subtle.
5. The five-stage cost-thread story is understandable in motion and every fallback.
6. Desktop, tablet, mobile, reduced-motion, no-WebGL, and JavaScript-disabled core states remain coherent.
7. Public-shell analytics, cookie consent, metadata, CTA routes, and `/new` reference behavior remain intact.
8. No unsupported product, customer, metric, integration, AI, BIM, pricing, or availability claim is added.

### In scope

- `/` landing-production composition, copy, styles, local motion, and local visual assets/components.
- Exact hero wrapper presentation around the current sanitized estimate workspace.
- One new central GSAP/Three.js story with semantic DOM/SVG fallback.
- Responsive, reduced-motion, no-WebGL, accessibility, and performance behavior.
- Root metadata copy only if required by the final approved page copy.
- Deletion of landing-production code that becomes unused after coherent replacement.

### Non-goals

- changing authenticated product behavior;
- rebuilding the estimating workspace to improve marketing visuals;
- redesigning `/new`;
- deploying to Cloudflare;
- adding dependencies;
- creating fake customers, case studies, metrics, pricing, or product screenshots;
- implementing BIM, takeoff, AI, or unbuilt integrations;
- running automated tests, broad builds, browser automation, screenshots, or visual QA without a separate current user authorization.

## Authoritative Evidence

- Root route: `src/app/page.tsx:1-22`.
- Legacy route: `src/app/new/page.tsx:1-24`.
- Current root composition: `src/components/landing-production/ArchestimatorNewLandingPage.tsx:53-88`.
- Current hero wrapper: `src/components/landing-production/NewLandingHeroDemo.tsx:17-97`.
- Exact sanitized workspace: `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx:18-67,220-320`.
- Current public copy: `src/components/landing-production/new-landing-content.ts:54-335`.
- Glass tokens/patterns: `src/app/globals.css:242-317,1510-1551`.
- Existing dependencies: `package.json` entries for GSAP, `@gsap/react`, Three.js, and Three types.
- Current Next.js 16 lazy-loading guide under `node_modules/next/dist/docs/`.
- Research artifacts in `research/`.

## Requirement Register

| ID | Requirement | Completion role | Acceptance |
| --- | --- | --- | --- |
| `REQ-001` | Target `/` while preserving `ProductionPublicPageShell`, metadata semantics, CTA destinations, and noindex `/new`. | CORE | `AC-001` |
| `UX-001` | Deliver a light, airy, direct visual system with brand orange and only subtle liquid-glass cues. | CORE | `AC-002` |
| `UX-002` | Keep the current exact sanitized workspace as hero proof; remove fake frame chrome; keep later screenshot slots neutral and honest. | CORE | `AC-003` |
| `UX-003` | Use a concise information architecture: hero, three-part value strip, broken handoff, five-stage workflow, focused proof, connected record, audience/FAQ, CTA. | CORE | `AC-004` |
| `UX-004` | Use one brand-orange cost thread and one GSAP/Three.js central story without creating a second scroll system. | CORE | `AC-005` |
| `UX-005` | Provide authored tablet, mobile, reduced-motion, no-WebGL, accessibility, and JavaScript-independent core content. | CORE | `AC-006` |
| `PERF-001` | Keep heavy motion out of the hero path, cap WebGL work, pause offscreen work, and avoid layout shift or leaks. | CORE | `AC-007` |
| `OPS-001` | Preserve analytics/consent/route behavior, avoid dependencies/deploy, and verify with authorized static evidence. | CORE | `AC-008` |

## Decision Register

### `DEC-AUTO-001` Target the root, preserve `/new`

Current source and the user request both make `/` the target. `/new` stays a noindex historical reference. No route promotion or redirect is needed.

### `DEC-AUTO-002` Resolve the `/new` hero wording to current source identity

The user wants the exact product workspace they associate with `/new`. Current source locates the exact sanitized workspace inside the root hero wrapper, while `/new` contains older placeholder visuals. Retain the exact `HeroEstimateWorkspaceMockup` product surface used by root and do not import the legacy placeholder composition.

### `DEC-AUTO-003` Separate product truth from presentation chrome

The underlying workspace is exact product proof. Browser dots, URL bar, glow, and fake window frame are not. Remove the chrome and preserve the product component, disclosure, deterministic state, and motion/visibility controls.

### `DEC-AUTO-004` Use honest screenshot slots after the hero

The user permits later placeholders. Use only neutral media slots that name the future exact route/state and contain no fabricated product geometry. Replace them with exact captures in a later authorized capture task.

### `DEC-AUTO-005` Use daylight material with limited glass

The page is predominantly warm white and near-black with orange signal. Glass is restricted to the scrolled header and small foreground hierarchy cues, with one blur layer per region and opaque fallbacks.

### `DEC-AUTO-006` Make WebGL purposeful and subordinate

Use one client-only Three.js scene for the connected-record story. GSAP owns native-scroll progress. Semantic DOM/SVG content owns meaning. The canvas is removable without losing the narrative.

### `DEC-AUTO-007` Reuse installed dependencies and local lifecycle patterns

GSAP, `@gsap/react`, and Three.js already exist. Use current local GSAP patterns, React cleanup, visibility gating, and Next.js 16 client-boundary rules. Add no package.

### `DEC-AUTO-008` Replace current section sprawl instead of restyling every card

The current production landing repeats claims across outcomes, bento, record flow, activity, principles, and matrix sections. Consolidate into the eight chapters in `02-DESIGN-REFERENCE-MOTION-SPEC.md` and delete route-owned code that becomes unused.

### `DEC-AUTO-009` Keep testing behind the user gate

Implementation may use source inspection, diff review, TypeScript, scoped lint, static scans, and `git diff --check`. Automated tests, builds used as test gates, browser automation, screenshots, and visual QA remain `TEST_PROPOSAL` until separately authorized.

### `DEC-AUTO-010` Supersede the stale landing plan

The 2026-07-21 pack is historical input, not an active implementation source. Its `/new` assumptions and reference choices are not carried forward. This pack is the only ready landing execution plan.

## Architecture and File Ownership

### Preserve unless current evidence requires a narrow change

- `src/app/page.tsx`
- `src/components/landing-production/ProductionPublicPageShell.tsx`
- `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx`
- authenticated product code and shared global glass utilities

### Expected primary edits

- `src/components/landing-production/ArchestimatorNewLandingPage.tsx`
- `src/components/landing-production/new-landing-content.ts`
- `src/components/landing-production/new-landing.module.css`
- `src/components/landing-production/NewLandingHeroDemo.tsx`
- `src/components/landing-production/NewLandingMotionController.tsx`

### Expected new route-owned modules

Names may be adjusted to established local naming, but responsibilities must remain separate:

- `src/components/landing-production/LandingCostThread.tsx`
- `src/components/landing-production/LandingWorkflowStory.tsx`
- `src/components/landing-production/LandingWorkflowScene.client.tsx`
- `src/components/landing-production/LandingWorkflowSceneLoader.client.tsx`
- `src/components/landing-production/LandingWorkflowFallback.tsx`
- `src/components/landing-production/LandingProductCaptureSlot.tsx`

### Deletion candidates

After replacement and import analysis, delete only route-owned modules/styles/content branches made unreachable by the new composition. Do not retain an unused bento/mini-UI system as a compatibility layer.

## Execution DAG

```text
UNIT-001 Evidence and proof lock
    -> UNIT-002 Hero, tokens, and page shell
    -> UNIT-003 Static chapters and honest proof slots
        -> UNIT-004 GSAP cost thread and WebGL story
            -> UNIT-005 Responsive, accessibility, and performance branches
                -> UNIT-006 Cleanup, route guardrails, and static verification
                    -> UNIT-007 Final requirement and evidence audit
```

One lead executor owns integration. A read-only explorer or reviewer may be used. Do not assign concurrent writers to the shared landing-production composition, copy registry, or stylesheet.

## `UNIT-001` Evidence and Proof Lock

- **Status:** READY
- **Dependencies:** none
- **Owns:** current-state inspection; no broad production edit
- **Requirements:** `REQ-001`, `UX-002`, `OPS-001`

### Steps

1. Run the repository startup contract and inspect `git status --short --branch`.
2. Re-read root, `/new`, shell, metadata, exact hero, current content, current motion controller, and relevant CSS immediately before editing.
3. Read the relevant installed Next.js 16 lazy-loading guide.
4. Record the exact hero provenance in the implementation handoff: real `EstimateWorkspaceClient`, sanitized fixture, deterministic states, static fallback, and disclosure.
5. Confirm every planned visible product claim against current source.
6. Confirm neutral replacement-slot labels and future exact route/state requirements.
7. Reconcile any source drift before starting `UNIT-002`.

### Stop evidence

- route map and proof provenance recorded;
- no unresolved factual claim;
- exact files for the first write pass identified;
- unrelated worktree edits remain preserved.

## `UNIT-002` Hero, Tokens, and Page Shell

- **Status:** PLANNED
- **Dependencies:** `UNIT-001`
- **Owns:** root landing composition shell, content registry, hero wrapper, base landing CSS
- **Requirements:** `REQ-001`, `UX-001`, `UX-002`, `UX-003`

### Steps

1. Replace current aurora/dark-leaning section tokens with route-owned warm-white, ink, rule, surface, and orange signal aliases.
2. Rebuild the compact header and pre-release treatment; preserve current CTA/sign-in behavior and accessible navigation.
3. Rebuild the hero with the approved direct copy, one primary CTA, secondary workflow link, and exact proof.
4. Remove fake browser dots, URL bar, glow, and frame geometry from `NewLandingHeroDemo`.
5. Preserve the hero proof disclosure, inert/presentation behavior, static first render, intersection gate, reduced-motion gate, and document-hidden pause.
6. Add the three-part value strip: structured scope, Excel in the workflow, client review attached.
7. Establish orange cost-thread primitives and section anchors without activating the central timeline yet.

### Stop evidence

- exact product proof remains mounted and disclosed;
- first viewport content is server-readable;
- no fake chrome or aurora implementation remains in active root imports/styles;
- primary CTA and navigation destinations match current behavior.

## `UNIT-003` Static Chapters and Honest Proof Slots

- **Status:** PLANNED
- **Dependencies:** `UNIT-002`
- **Owns:** static content sections, fallback story markup, capture-slot component, page copy
- **Requirements:** `UX-002`, `UX-003`, `UX-005`

### Steps

1. Implement the broken-handoff editorial chapter with a visible concept label.
2. Implement semantic five-stage workflow copy and the DOM/SVG fallback before any WebGL work.
3. Implement up to three alternating product-proof modules.
4. Use the exact hero only in the hero. Use neutral replacement slots for unavailable later captures.
5. Each slot names the exact future route/state and visibly says `Exact product capture required`.
6. Implement the connected-record ledger/matrix without six equal cards or fabricated UI.
7. Implement compact audience, pre-release, FAQ, final CTA, and footer sections.
8. Remove unsupported or repetitive current claims during composition replacement.

### Stop evidence

- full narrative is understandable before motion loads;
- no neutral slot resembles a dashboard or contains fake controls;
- every concept visual is labelled;
- one CTA hierarchy remains clear throughout.

## `UNIT-004` GSAP Cost Thread and WebGL Story

- **Status:** PLANNED
- **Dependencies:** `UNIT-003`
- **Owns:** motion controller, cost-thread component, WebGL loader/island, story-specific styles
- **Requirements:** `UX-004`, `PERF-001`

### Steps

1. Refactor the route motion controller around one `gsap.matchMedia()` lifecycle and scoped cleanup.
2. Create one labelled ScrollTrigger timeline for `structure`, `reuse`, `issue`, `review`, and `revise`.
3. Pin only the story stage on desktop and preserve native document scrolling.
4. Draw/reveal the orange thread through DOM/SVG and pass normalized progress/stage state to the Three.js island.
5. Implement the shallow document-plane scene with simple geometry and no fabricated product UI.
6. Add the client-owned `next/dynamic` boundary with `ssr: false` inside a Client Component.
7. Preserve the server-rendered fallback dimensions and content before load.
8. Cap DPR, avoid post-processing/shadows, render on state change, pause offscreen/hidden work, and dispose all resources.
9. Ensure reverse scroll restores previous stages coherently.

### Stop evidence

- one native scroll system;
- one central timeline with five labels;
- no essential text inside canvas;
- fallback exists before load and after failure;
- no persistent animation after scrolling stops.

## `UNIT-005` Responsive, Accessibility, and Performance Branches

- **Status:** PLANNED
- **Dependencies:** `UNIT-004`
- **Owns:** responsive CSS, matchMedia branches, accessibility details, no-WebGL/reduced-motion behavior
- **Requirements:** `UX-005`, `PERF-001`

### Steps

1. Tune desktop at common 1280 and 1440 widths before mobile polish.
2. Implement tablet layout with reduced depth and flexible copy/stage placement.
3. Replace desktop pin/WebGL with five normal-flow states on mobile by default.
4. Keep the exact hero proof in its static final state on mobile and reduced motion.
5. Implement live preference handling for `prefers-reduced-motion`.
6. Handle WebGL absence, initialization failure, offscreen state, and document visibility without blanking the section.
7. Verify semantic headings, skip link, focus-visible, navigation, FAQ controls, contrast, labels, and decorative-canvas isolation through source/static inspection.
8. Prevent horizontal overflow at 320px and preserve explicit media aspect ratios.

### Stop evidence

- every stage and sentence exists outside animation;
- no motion-only information;
- mobile does not scale down the desktop pin;
- WebGL failure retains complete content;
- source and CSS contracts show no fixed desktop-only overflow dependency.

## `UNIT-006` Cleanup, Route Guardrails, and Static Verification

- **Status:** PLANNED
- **Dependencies:** `UNIT-005`
- **Owns:** landing-production dead-code removal, metadata alignment if needed, authorized static verification
- **Requirements:** `REQ-001`, `OPS-001`, `PERF-001`

### Steps

1. Delete route-owned landing modules, exports, CSS, and content branches made unused by the replacement.
2. Confirm `ProductionPublicPageShell`, cookie consent, landing analytics, CTA tracking, contact mailto, sign-in/workspace actions, and root metadata remain current.
3. Confirm `/new` still renders its noindex reference and was not modified.
4. Confirm no authenticated product behavior or global design-system contract changed for marketing convenience.
5. Run `git diff --check`.
6. Run scoped ESLint on touched landing files.
7. Run the repository TypeScript check.
8. Run source scans for em dashes in visible copy, banned fake-proof markers, unsupported claims, placeholder UI, auroras, fake chrome, and unused landing imports.
9. Inspect the complete diff and repair only in-scope findings.

### Static command set

```bash
git diff --check
bun run lint -- src/app/page.tsx src/components/landing-production
bun run type-check
rg -n "traffic-light|heroDemoDots|heroDemoUrl|aurora|fake dashboard|placeholder screenshot|BIM|automated takeoff|AI-powered|customer logos|Awwwards-winning" src/components/landing-production src/app/page.tsx
```

Adjust paths to the actual changed file list. Do not broaden into unrelated suites or a build gate.

### Stop evidence

- static commands read and pass, or failures are proven unrelated and reported;
- no unused active landing implementation remains;
- route/shell/analytics/metadata guardrails are reconciled;
- no deployment attempted.

## `UNIT-007` Final Requirement and Evidence Audit

- **Status:** PLANNED
- **Dependencies:** `UNIT-006`
- **Owns:** acceptance reconciliation and final handoff only
- **Requirements:** all

### Steps

1. Reconcile `AC-001` through `AC-008` individually against fresh source/diff/static evidence.
2. Record the exact hero component, fixture nature, disclosure, and static/motion behavior.
3. List every later screenshot slot and the route/state its exact replacement must capture.
4. Record desktop, tablet, mobile, reduced-motion, no-WebGL, and JavaScript-independent behavior.
5. Record unrun browser/visual proof as a gap unless the user separately opens `AUTH-001`.
6. Report changed files, simplifications/deletions, evidence, and real remaining risk.
7. Stop only when no safe in-scope implementation work remains.

## Unit-Level Static Evidence Contract

Every unit must end with its own executable evidence before the next unit begins. These are static checks, not automated product tests.

| Unit | Tool and steps | Expected result |
| --- | --- | --- |
| `UNIT-001` | Run `git status --short --branch`; inspect the cited route/hero/content files with `sed`/`rg`; run `git diff --name-only --` against root, `/new`, shell, hero, and landing-production paths. | Route/proof map matches current source; claims have source locations; unrelated work is listed; no production edit has started. |
| `UNIT-002` | Run `git diff --check -- <owned files>`; run scoped ESLint on the edited landing composition, content, hero wrapper, and stylesheet; scan active imports/styles for `heroDemoDots`, `heroDemoUrl`, `aurora`, and fake frame markers. | Hero still imports exact proof; disclosure/static gates remain; chrome/aurora markers are absent from active root code; lint/diff checks pass. |
| `UNIT-003` | Run `git diff --check -- <owned files>` and scoped ESLint; scan for `Exact product capture required` and the concept label; inspect every replacement-slot render path and active visible claim. | Full server-readable narrative exists; each missing capture has a neutral labelled slot and route/state caption; no slot contains fabricated UI; claims are source-backed. |
| `UNIT-004` | Run scoped ESLint and TypeScript/LSP diagnostics on motion/scene files; scan for one ScrollTrigger timeline, five labels, one client-owned dynamic import, DPR cap, visibility pause, fallback import, and disposal calls. | Native scroll has one owner; `structure/reuse/issue/review/revise` are explicit; canvas is lazy/nonessential; no unconditional render loop or leaked resource is visible in source. |
| `UNIT-005` | Run scoped ESLint and TypeScript/LSP diagnostics; scan CSS/JS for desktop/tablet/mobile, `prefers-reduced-motion`, no-WebGL/load-failure, visibility, and 320px overflow branches; inspect semantic fallback order. | Every stage and sentence survives without pin/WebGL; mobile is stacked; hero is static in reduced motion; source has no fixed desktop-only overflow dependency. |
| `UNIT-006` | Run the exact static command set in this unit, then inspect the complete scoped diff and `git status`. | Diff check, lint, typecheck, and banned-pattern scan pass; dead route-owned code is removed; `/new`, public shell, analytics, consent, CTA routes, and unrelated work remain intact. |
| `UNIT-007` | Complete the checklist in `03-VALIDATION-RESUME-AUDIT.md`; map each `AC-*` to a fresh command/source result; list every unrun proposed browser state. | Every criterion has independent evidence or an explicit proof gap; no unrun check is passed; handoff includes exact hero provenance, capture slots, fallbacks, changed files, and remaining risks. |

## Acceptance Criteria

### `AC-001` Route and public-shell integrity

- `/` renders the redesigned landing inside the current public shell.
- `/new` remains noindex and unchanged.
- current CTA, sign-in/workspace, analytics, consent, and metadata behavior remain factual.

### `AC-002` Light material direction

- page is predominantly light and airy;
- brand orange is the primary action and thread signal;
- glass is limited, shallow, and never the default card/container system;
- no active aurora, generic gradient, fake chrome, logo marquee, or generic bento grid remains.

### `AC-003` Product-proof truth

- hero uses the real sanitized workspace component and a truthful disclosure;
- fake browser frame elements are removed;
- later missing captures are neutral labelled slots, not product imitations;
- concepts are visibly separate from product proof.

### `AC-004` Information and copy clarity

- first viewport explains what Archestimator is, who it serves, and what action to take;
- hero is at most three lines on common desktop widths;
- the three-part value strip is retained;
- sections follow the specified narrative without filler or repeated card grids;
- no unsupported claim or public-beta internal mechanic appears.

### `AC-005` Motion and WebGL narrative

- one GSAP timeline owns the five stages;
- native scroll remains interruptible and reversible;
- Three.js is subordinate to progress and contains no essential copy/product UI;
- motion stops when scroll stops;
- the orange thread remains meaningful through the section.

### `AC-006` Responsive and accessibility alternatives

- mobile uses five stacked states and does not require the full canvas;
- reduced motion removes pinning and large movement;
- no-WebGL/load failure retains the full story;
- semantics, focus, contrast, controls, and headings remain coherent;
- no horizontal overflow contract remains at 320px.

### `AC-007` Performance and lifecycle

- heavy story code is absent from the initial hero path;
- proof/scene dimensions prevent layout shift;
- DPR and geometry/material cost are bounded;
- offscreen/hidden rendering pauses;
- renderer, observers, GSAP resources, geometry, and materials clean up.

### `AC-008` Verification and scope discipline

- authorized static checks pass or exact gaps are reported;
- unrelated work remains untouched;
- no dependency or deployment is added;
- final handoff lists exact proof, placeholders, fallbacks, changed files, simplifications, and unrun visual proof.

## Risk Register

| ID | Risk | Mitigation | Owner unit |
| --- | --- | --- | --- |
| `RISK-001` | The exact hero component is heavy or visually unreadable after chrome removal. | Preserve its aspect ratio/scale contract, keep static-first behavior, and tune the surrounding surface rather than reconstructing UI. | `UNIT-002`, `UNIT-005` |
| `RISK-002` | Neutral screenshot slots are styled until they imply product behavior. | Ban internal UI geometry; require exact-capture label and route/state caption. | `UNIT-003`, `UNIT-007` |
| `RISK-003` | Glass expands into generic SaaS cards. | Restrict glass to nav/small foreground cues with one blur per region and opaque fallback. | `UNIT-002`, `UNIT-005` |
| `RISK-004` | GSAP pinning fights mobile or reverse scroll. | One timeline, one pin, `matchMedia`, labels, native scroll, and stacked mobile branch. | `UNIT-004`, `UNIT-005` |
| `RISK-005` | Three.js adds weight without meaning. | Load after hero, keep scene removable, render on progress, cap DPR, and cut canvas before compromising proof/fallback. | `UNIT-004`, `UNIT-005` |
| `RISK-006` | Current client-review copy overstates source-backed behavior. | Re-audit exact share/review routes in `UNIT-001`; narrow copy before publish. | `UNIT-001`, `UNIT-003` |
| `RISK-007` | Old landing pack or prompt reintroduces stale `/new` assumptions. | Use this pack as the sole execution source and mark the old pack superseded. | `UNIT-001`, `UNIT-007` |
| `RISK-008` | Visual quality is claimed without rendered proof. | Treat browser QA as a proposal; report the gap unless user opens the boundary. | `UNIT-006`, `UNIT-007` |

## Authorization Boundary

### `AUTH-001` Browser and automated product validation

Closed by default. A separate current user request is required before running browser automation, screenshots, visual QA, automated product tests, or a build used as a test gate.

If opened, the proposed visual evidence is:

- 1440 x 1000 desktop;
- 1280 x 800 laptop;
- 768 x 1024 tablet;
- 390 x 844 mobile;
- 320 x 812 narrow mobile;
- reduced-motion desktop/mobile;
- no-WebGL/static fallback;
- full down-scroll and up-scroll through the five-stage story.

## Resume Contract

Before resuming implementation:

1. Read the FAST PATH state block and run the repository startup contract.
2. Inspect `git status --short --branch` and preserve unrelated work.
3. Re-read this file, `01-CURRENT-STATE-AND-PROOF.md`, and the next unit.
4. Re-read every file owned by the next unit immediately before editing.
5. If root route, hero proof, CTA routes, glass tokens, GSAP/Three versions, or validation authorization changed, mark the affected evidence stale and rebaseline.
6. Execute only the next ready unit and its dependency-supported follow-ons.
