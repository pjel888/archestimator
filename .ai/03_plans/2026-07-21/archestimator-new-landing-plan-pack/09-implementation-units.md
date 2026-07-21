# Canonical Execution Plan — Implementation Units

## Execution status

**Package status:** `IMPLEMENTATION_READY`  
**Implementation status:** `NOT_STARTED`  
**Release status:** `NOT_EVALUATED`  
**Exact next unit:** `UNIT-001`  
**Action ceiling:** local implementation only  
**Target route:** `/new`

This is the canonical execution artifact. When this document conflicts with a supplemental document, stop and reconcile the conflict before changing code.

## Operating rules

1. Follow `AGENTS.md` before this pack.
2. Work only on `/new` and the smallest reusable hero surface required.
3. Keep each unit’s diff narrow.
4. Do not perform opportunistic refactors.
5. Do not add dependencies.
6. Do not change provider, database, auth, deployment, or external state.
7. Do not run or create automated tests, builds-as-tests, browser automation, screenshots, Storybook, or visual-QA artifacts without explicit owner authorization.
8. Static source checks, TypeScript, ESLint, `git diff --check`, and the plan-pack validator are permitted evidence lanes.
9. Record deviations immediately in the completion report.
10. Stop after `UNIT-009`; promotion of `/new` is a separate task.

## Dependency graph

```text
UNIT-001 Truth and baseline lock
    ↓
UNIT-002 Route shell and content architecture
    ↓
UNIT-003 Scoped visual system and primitives
    ├───────────────┐
    ↓               ↓
UNIT-004 Real hero product proof
    ↓               ↓
UNIT-005 Mapped page sections
    └───────┬───────┘
            ↓
UNIT-006 Motion and microinteractions
            ↓
UNIT-007 Responsive, accessibility, and performance hardening
            ├───────────────┐
            ↓               ↓
UNIT-008 Metadata, analytics, and route guardrails
            └───────┬───────┘
                    ↓
UNIT-009 Final audit, evidence, and handoff
```

## Ready slice

The implementation-ready slice is:

```text
SLICE-001
UNIT-001 → UNIT-002 → UNIT-003 → UNIT-004 → UNIT-005 → UNIT-006 → UNIT-007 → UNIT-008 → UNIT-009
```

Do not skip a predecessor because the page appears visually complete.

---

# UNIT-001 — Truth and Baseline Lock

## Goal

Establish a fresh, explicit source baseline before writing page code so the implementation cannot drift from the owner brief, canonical corpus, or current shared-hero behavior.

## Preconditions

- repository access;
- current branch known;
- no assumption that the pack’s observed source is still current;
- no pending owner instruction that changes `/new` scope.

## Files read

```text
AGENTS.md
.ai/10_state/current-state.md          # FAST PATH only
src/app/new/page.tsx
src/app/page.tsx
src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
src/components/landing-v3/landing-v3.module.css
src/components/landing/PublicPageShell.tsx
src/components/landing/ContactForm.tsx
src/components/landing/LandingAnalyticsLoader.tsx
src/app/sitemap.ts
src/app/globals.css
package.json
```

Read the current Notion operating, strategy, and brand pages when accessible.

## Steps

1. Run the repository startup contract:

   ```bash
   bun run supermemory:ensure
   git status --short --branch
   ```

2. Record the current HEAD and scoped working-tree status.
3. Confirm `/new` still returns no page content and still has noindex metadata.
4. Confirm `/` still renders `landing-v3`.
5. Confirm the hero still mounts sanitized data through `EstimateWorkspaceClient`.
6. Confirm `/contact?intent=beta-request` still maps to the access-request flow.
7. Confirm GSAP remains installed and Motion/Framer Motion remains absent.
8. Confirm no verified public sample proposal has been supplied.
9. Search canonical sources for any newer approved hero, CTA, category, stage, or pricing language.
10. Update the source register and mark any changed pack claim stale before implementation.

## Required output

Add a short baseline note to the implementation report containing:

- HEAD;
- branch;
- changed paths present before implementation;
- source revisions checked;
- stale assumptions;
- owner-provided changes, if any.

Do not modify source in this unit unless the plan package itself needs reconciliation.

## Acceptance

- `AC-004` copy canon is current.
- `AC-008` privacy/truth boundaries are current.
- no source conflict is silently ignored.

## Evidence

- updated baseline note;
- source-path list;
- scoped status hash or plain status snapshot;
- no unacknowledged pre-existing changes.

## Stop conditions

Stop and reconcile before `UNIT-002` if:

- `/new` is no longer the target;
- `/new` is already implemented by another branch or worktree;
- the approved CTA changed;
- the sample-proposal asset now exists;
- the hero component no longer represents the current product;
- a route owner or active plan conflicts with this package.

---

# UNIT-002 — Route Shell and Content Architecture

## Goal

Replace the blank `/new` route with a complete semantic page shell and static content structure, without motion or final visual polish.

## Target files

Create:

```text
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/new-landing-content.ts
src/components/landing-new/NewLandingPrimitives.tsx
```

Edit:

```text
src/app/new/page.tsx
```

Initial CSS file may also be created with only safe base styles:

```text
src/components/landing-new/new-landing.module.css
```

## Steps

1. Create `new-landing-content.ts`.
2. Transcribe the copy from [`05-copy-deck.md`](./05-copy-deck.md) exactly.
3. Centralize:

   ```text
   EARLY_ACCESS_HREF
   WORKSPACE_HREF
   LOGIN_HREF
   navItems
   workflowOutcomes
   audiences
   bentoChapters
   recordFlow
   activityEntries
   principles
   connectionPairs
   earlyAccess copy
   faqs
   footerLinks
   ```

4. Create the server-compatible page component.
5. Render:
   - skip link;
   - custom header;
   - one `main`;
   - all sections in the exact architecture order;
   - custom footer;
   - FAQ JSON-LD generated from visible FAQ data.
6. Use `ArchestimatorLogo`.
7. Add CTA data attributes.
8. Add a small client CTA island only if `useLandingAuthHint` is required.
9. Update `/new/page.tsx` to render:

   ```tsx
   <PublicPageShell isHomePage>
     <ArchestimatorNewLandingPage />
   </PublicPageShell>
   ```

10. Keep `force-static`.
11. Keep noindex.
12. Do not mount the current landing A/B provider.
13. Do not add hero animation yet; a labeled static placeholder can occupy the frame until `UNIT-004`.

## Semantic checklist

- one `h1`;
- one `main`;
- section `aria-labelledby` references resolve;
- header and footer outside main;
- nav anchors resolve;
- FAQ uses native details;
- no card is a fake button;
- no noninteractive surface receives tab focus;
- decorative illustrations are hidden from assistive technology when redundant.

## Content checklist

- primary CTA says “Request early access”;
- primary signed-out destination is `/contact?intent=beta-request`;
- no “Book a walkthrough”;
- no secondary sample CTA;
- no Pricing nav;
- no customer proof;
- no public price;
- pre-release stage visible;
- exact approved hero present.

## Acceptance

- `AC-001` route is isolated.
- `AC-002` structural sequence exists.
- `AC-004` approved copy is centralized.
- `AC-010` early-access conversion model is present.

## Evidence

- scoped diff of created files;
- static heading and anchor review;
- text search for prohibited rendered phrases.

## Rollback

Deleting the new folder and restoring `src/app/new/page.tsx` returns the route to its prior blank state. No shared state should have changed in this unit.

---

# UNIT-003 — Scoped Visual System and Primitives

## Goal

Implement the light Archestimator design system and core structural visuals without adding motion runtime or touching global design tokens.

## Target files

```text
src/components/landing-new/new-landing.module.css
src/components/landing-new/NewLandingPrimitives.tsx
src/components/landing-new/ArchestimatorNewLandingPage.tsx
```

## Steps

1. Add route-scoped tokens from [`06-visual-design-system.md`](./06-visual-design-system.md).
2. Add root background, text, focus, skip-link, container, section-spacing, and heading styles.
3. Implement the light sticky header.
4. Implement primary and utility CTA states.
5. Implement hero copy geometry and reserved product-frame geometry.
6. Implement outcome row, marquee frame, bento grid, split layouts, card systems, FAQ, final CTA, dock, and footer.
7. Add light hero/final aurora static gradients before animation.
8. Build route-owned mini product illustrations.
9. Use existing Phosphor icons.
10. Ensure every color and spacing value comes from a semantic route token or an intentional local exception.
11. Keep the page usable at 360 pixels even before the dedicated responsive unit.
12. Avoid editing `globals.css`.

## Visual invariants

- overall canvas is light;
- orange is an accent, not the page background;
- dark orange is used for small text/CTA contrast;
- product frame is the strongest visual object;
- cards use thin borders and restrained shadows;
- no full-width dark section;
- no glass blur on every surface;
- no tiny gray copy;
- no stock photography;
- no fake chart or KPI.

## Acceptance

- `AC-002` light visual system and Velora rhythm are represented.
- `AC-006` CSS is ready for reduced-motion and microinteraction layers.
- no dependency or global-theme change is introduced.

## Evidence

- source token review;
- class ownership review;
- scoped diff proving only `landing-new` files changed in this unit.

## Rollback

All styles are scoped to `landing-new`; reverting that folder does not change other routes.

---

# UNIT-004 — Real Hero Product Proof

## Goal

Place the current sanitized Archestimator estimate workspace inside the `/new` hero and add controlled desktop loop/static mobile behavior without changing the live `/` experience.

## Target files

Create:

```text
src/components/landing-new/NewLandingHeroDemo.tsx
```

Edit conditionally:

```text
src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/new-landing.module.css
```

## Shared-component change contract

Any new prop must be optional and default to existing behavior.

Recommended props:

```ts
playback?: "loop" | "static";
staticPhase?: HeroAnimationPhase;
pauseWhenDocumentHidden?: boolean;
className?: string;
```

The existing call:

```tsx
<HeroEstimateWorkspaceMockup />
```

must behave as before.

## Steps

1. Read every current call site.
2. Export or internally preserve the phase type needed by the wrapper.
3. Add static/loop behavior without changing sanitized data.
4. Ensure switching to static:
   - cancels the active timer;
   - ends shared drag state;
   - publishes the stable phase data;
   - does not leave cursor/ghost in drag mode.
5. Ensure hidden-document pause is optional and cleanup-safe.
6. Create `NewLandingHeroDemo`.
7. Add one media query for desktop eligibility, one reduced-motion query, one visibility listener, and one intersection observer.
8. Derive `shouldLoop`.
9. Render stable product UI on the first render.
10. Build the light browser frame around it.
11. Add the sanitized-demo disclosure.
12. Keep the frame visible on mobile.
13. Keep pointer events disabled inside the product UI.
14. Preserve the current internal `1780 × 900` scaling model unless a smaller source-safe scale improves mobile legibility.
15. Avoid `ssr: false` in the first implementation.

## Mobile behavior

- static phase: `fauxwood-replaced`;
- no cursor or drag ghost;
- preserve a useful product crop;
- minimum visual height sufficient to recognize scope tree, estimate rows, and library relationship;
- no horizontal page overflow;
- disclosure remains visible.

## Desktop behavior

- loop starts only when in view and page visible;
- loop pauses offscreen or hidden;
- stable fallback during pause;
- no user interaction is captured;
- browser frame preserves layout before hydration.

## Acceptance

- `AC-003` real product proof is used.
- `AC-005` product proof remains on mobile.
- `AC-007` loop lifecycle is bounded.
- `AC-008` data remains sanitized.
- existing `/` hero default remains unchanged.

## Evidence

- call-site diff;
- shared prop defaults;
- static mode source proof;
- cleanup source proof;
- route-isolation diff.

## Stop conditions

Stop if:

- the hero component cannot be made static without changing the live route;
- sanitized data is no longer local;
- a browser API is required during render;
- the shared drag store cannot be safely paused;
- the hero’s transitive client bundle proves unacceptable through authorized measurement.

If the first four occur, use a route-local static representation of the same product UI rather than a fake dashboard, and record the deviation.

---

# UNIT-005 — Mapped Page Sections

## Goal

Complete every Velora-mapped section with Archestimator-specific content and semantic product mini-visuals.

## Target files

```text
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/NewLandingPrimitives.tsx
src/components/landing-new/new-landing-content.ts
src/components/landing-new/new-landing.module.css
```

## Steps by section

### Four outcomes

- render four indexed cells;
- no number ticker;
- keep each body to one sentence.

### Audience marquee content

- render role labels;
- do not use logos;
- do not say “trusted by”;
- preserve a semantic nonduplicated list for assistive technology.

### Product bento

- render exactly four cards;
- use mini scope tree, saved component, output bridge, and revision trail;
- do not place a CTA in every card;
- keep card copy from the copy deck.

### Connected record

- render six stages in DOM order;
- use SVG/CSS lines;
- add an accessible description;
- do not call it an integration ecosystem.

### Activity story

- render four sanitized entries;
- label as a sanitized workflow example;
- no live indicator, timestamps, or real-looking user identity.

### Product principles

- render exactly three cards;
- include Excel’s ongoing role;
- preserve keyboard-safe interaction.

### Connection matrix

- render exactly six pair cards;
- no testimonial semantics;
- no quotes, stars, faces, or attribution.

### Early access

- render two cards;
- no currency;
- primary CTA only in the action card;
- make pre-release stage clear;
- include no-payment/no-commitment language only for the design-partner conversation.

### FAQ

- render five questions;
- generate JSON-LD from the same array;
- keep native details semantics.

### Final CTA and dock

- repeat canonical promise;
- repeat primary action;
- dock contains four workflow labels;
- dock does not create false destinations.

### Footer

- render approved boilerplate and essential links;
- no pricing link unless owner decides otherwise.

## Density audit

After composing all sections:

1. count rendered cards and questions;
2. identify repeated claims;
3. remove duplicate explanatory sentences;
4. check no section has two different primary messages;
5. keep main narrative within the 700–900 word target;
6. preserve whitespace rather than shrinking type.

## Acceptance

- `AC-002` all mapped sections exist in correct order.
- `AC-004` copy is accurate and concise.
- `AC-008` no fabricated proof appears.
- `AC-010` pricing is replaced by truthful early-access expectations.

## Evidence

- section-order source review;
- copy array review;
- prohibited-phrase scan;
- narrative word count recorded in completion report.

## Rollback

All section work is route-owned. Reverting `landing-new` removes it without affecting the application.

---

# UNIT-006 — Motion and Microinteractions

## Goal

Add restrained Velora/LaunchPad-inspired motion using existing GSAP and CSS while preserving a complete static and reduced-motion experience.

## Target files

Create:

```text
src/components/landing-new/NewLandingMotionController.tsx
```

Edit:

```text
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/new-landing.module.css
src/components/landing-new/NewLandingPrimitives.tsx
```

Potential hero edit only for lifecycle fixes discovered here:

```text
src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
```

## Steps

1. Add a route-scoped motion controller.
2. Implement a two-pixel scroll progress line.
3. Implement hero entrance with the documented timeline.
4. Add one-shot reveal targets through data attributes.
5. Activate the connected-record line when in view.
6. Add CSS aurora animation in hero and final CTA.
7. Add one product-frame border beam.
8. Add audience marquee.
9. Add fine-pointer spotlight behavior.
10. Add controlled connection-card lift/tilt.
11. Add CTA arrow response.
12. Add FAQ chevron transition.
13. Add workflow-dock hover/focus response.
14. Add complete cleanup.
15. Add one reduced-motion media block that:
    - stops perpetual CSS animations;
    - removes reveal transforms;
    - stops tilt/spotlight tracking;
    - leaves all content visible;
    - requests static hero mode.

## Motion limits

- no new dependency;
- no text rotation/typewriter;
- no more than two perpetual effects in one viewport;
- no layout animation;
- no scroll hijack;
- no continuous activity-feed mutation;
- no 3D/particle scene;
- no cursor-follow effect outside the sanitized product demo;
- no motion required to discover content.

## Acceptance

- `AC-006` motion communicates product/workflow and respects reduced motion.
- `AC-007` motion lifecycle and runtime budget are bounded.
- all animations have cleanup.

## Evidence

- dependency diff proving none added;
- source review of media queries and cleanup;
- static fallback review;
- simultaneous-animation inventory.

## Rollback

Removing the motion controller and animation declarations must leave a complete static page.

---

# UNIT-007 — Responsive, Accessibility, and Performance Hardening

## Goal

Reconcile the full page against required viewport behavior, semantic/accessibility invariants, and source-level performance budgets.

## Target files

Primarily:

```text
src/components/landing-new/new-landing.module.css
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/NewLandingHeroDemo.tsx
src/components/landing-new/NewLandingMotionController.tsx
src/components/landing-new/NewLandingPrimitives.tsx
```

Shared hero only if a lifecycle or static-mode defect remains.

## Required viewport contract

Source must explicitly account for:

```text
360
390
768
1024
1280
1440
1920
```

Without authorized browser work, this unit performs source reconciliation and records a test proposal rather than claiming visual proof.

## Responsive steps

1. Verify no fixed page width exceeds its container.
2. Verify hero H1 has safe narrow-screen sizing.
3. Verify mobile menu targets.
4. Verify CTA wraps or fills without clipping.
5. Verify product frame stays visible and scaled.
6. Verify outcome cells become two-by-two or one column as needed.
7. Verify marquee becomes static under reduced motion.
8. Verify bento becomes one column.
9. Verify flow becomes vertical in DOM order.
10. Verify activity copy precedes panel on mobile.
11. Verify three- and six-card grids collapse predictably.
12. Verify early-access cards stack.
13. Verify dock labels remain readable.
14. Verify footer becomes a vertical or wrapped layout.
15. Add `overflow-x: clip` only at the route root; fix actual offenders rather than hiding all overflow.

## Accessibility steps

1. Check landmarks and heading order.
2. Check skip link.
3. Check anchor targets are not hidden under the sticky header; use `scroll-margin-top`.
4. Check every control’s accessible name.
5. Check focus-visible states.
6. Check color usage against documented contrast choices.
7. Check touch targets.
8. Check native details/menu behavior.
9. Check repeated marquee content is not duplicated to assistive technology.
10. Check product cursor/drag ghost is decorative.
11. Check connected-flow description is available in text.
12. Check no auto-updating region announces demo changes.
13. Check reduced motion exposes the stable product state.
14. Check no noninteractive cards become tabbable.

## Performance steps

1. Confirm no dependency change.
2. Confirm lower sections can use `content-visibility: auto` with safe intrinsic size.
3. Reserve product-frame geometry.
4. Reserve mini-visual geometry.
5. Remove unnecessary `will-change`.
6. Pause hero loop offscreen/hidden.
7. Stop pointer tracking on coarse input.
8. Keep ambient blur areas small.
9. Avoid rendering duplicated semantic marquee items.
10. Keep LCP candidate in hero text, not a late product asset.
11. Ensure the page adds no content/product network request. The existing same-origin auth-hint request and consent-gated analytics are permitted public-shell behavior.
12. Record the estimated new client islands and why each is required.

## Acceptance

- `AC-005` responsive contract including mobile product proof.
- `AC-006` keyboard and reduced-motion behavior.
- `AC-007` source-level performance budget.
- no known semantic or overflow defect remains.

## Evidence

Permitted:

- source review;
- CSS breakpoint map;
- static accessibility checklist;
- TypeScript;
- ESLint;
- scoped diff;
- explicit unrun browser/build test proposal.

Do not claim real CLS, LCP, INP, or visual viewport proof without authorized measurement.

## Rollback

Hardening should remain route-owned. If a shared hero change is required, preserve old defaults and record the reason.

---

# UNIT-008 — Metadata, Analytics, and Route Guardrails

## Goal

Finalize preview metadata, public CTA instrumentation, shell behavior, and route-isolation guarantees.

## Target files

```text
src/app/new/page.tsx
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/NewLandingPrimitives.tsx
src/components/landing-new/new-landing-content.ts
```

## Steps

1. Set absolute metadata title.
2. Set accurate description.
3. Preserve `robots: { index: false, follow: false }`.
4. Preserve `dynamic = "force-static"`.
5. Confirm no `/new` sitemap entry.
6. Confirm no redirect or rewrite.
7. Confirm `PublicPageShell isHomePage`.
8. Confirm consent and analytics remain inherited.
9. Confirm all primary CTAs use:

   ```text
   data-landing-cta="primary"
   data-landing-cta-location="<location>"
   ```

10. Confirm signed-out href is `/contact?intent=beta-request`.
11. Confirm signed-in href can be `/workshop`.
12. Confirm sign-in destination remains explicit.
13. Confirm FAQ JSON-LD matches visible copy.
14. Do not add canonical production metadata or public OG claims that imply `/new` is launched.
15. Confirm no pricing or sample-proposal route is introduced.

## Acceptance

- `AC-001` route remains isolated.
- `AC-009` preview SEO and analytics behavior are correct.
- `AC-010` conversion path is truthful and functional by source.

## Evidence

- route source;
- sitemap source unchanged;
- CTA destination and data attributes;
- shell source;
- metadata source;
- FAQ visible/schema single-source proof.

## Promotion boundary

Do not convert `/new` into `/`, update the sitemap, change canonicals, or remove noindex in this unit. Those actions require a new owner-approved release plan.

---

# UNIT-009 — Final Audit, Evidence, and Handoff

## Goal

Reconcile every requested outcome against current source, run permitted static checks, document unrun test proposals, and leave a precise resumable completion report.

## Preconditions

- Units 001–008 complete.
- No unresolved source conflict.
- No owner-authorized testing assumed.

## Static verification commands

Run only commands permitted by current repository policy and environment:

```bash
git diff --check
bun run type-check
bun run lint -- src/app/new/page.tsx src/components/landing-new src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
```

Adjust the lint invocation only to match repository CLI behavior. If lint does not accept a directory or file list, run the repository lint command and report the actual scope.

After importing/updating the pack:

```bash
bun run validate:plan-pack .ai/03_plans/2026-07-21-new-landing-page
```

Static searches:

```bash
rg -n \
  "Trusted by|Loved by|Bids won|Revenue|Conversion|AI-powered|Autonomous|Marketplace|Procurement|Payments|Industry-leading|Enterprise-ready|Legally binding|Immutable approval|See who opened|Book a walkthrough|See the workflow|Free forever|Starting at|per month" \
  src/app/new src/components/landing-new

rg -n "/contact\\?intent=beta-request|data-landing-cta|noindex|follow" \
  src/app/new src/components/landing-new
```

Review the shared diff:

```bash
git diff -- src/app/page.tsx \
  src/components/landing-v3/ArchestimatorLandingPage.tsx \
  src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx \
  src/app/sitemap.ts \
  src/app/globals.css \
  package.json bun.lock
```

Expected:

- only the hero mockup may change among these files;
- its changes are optional props/lifecycle behavior;
- no package or lockfile change;
- no current `/` page change;
- no sitemap/global-token change.

## Completion audit

Reconcile:

- `REQ-001`, `REQ-002`, `REQ-003`;
- `UX-001`, `UX-002`, `UX-003`, `UX-004`;
- `PERF-001`;
- `SEC-001`;
- `OPS-001`;
- `AC-001` through `AC-010`.

For each, record:

```text
PASS | FAIL | BOUNDARY | N/A
evidence path or command output
remaining limitation
```

Do not convert a test proposal into a pass.

## Completion report

The report must include:

1. outcome summary;
2. exact files created;
3. exact files modified;
4. shared-file changes and why;
5. route-isolation result;
6. copy/claim audit result;
7. permitted commands run and results;
8. commands not run;
9. test proposals awaiting authorization;
10. known visual/performance uncertainty;
11. requirement-evidence table;
12. current `git status --short`;
13. exact next action, if any;
14. explicit statement that no deployment or promotion occurred.

## Acceptance

- `AC-001`, `AC-004`, `AC-008`, and `AC-009` receive final evidence.
- no hidden scope expansion remains;
- all failures are honest;
- implementation state is resumable.

## Terminal state

This local implementation task may be marked complete only when all code-provable core criteria pass or are explicitly held at an authorized boundary.

Release remains `NOT_EVALUATED` until the owner separately authorizes visual/browser/build validation and promotion.

## Stop

Do not:

- change `/`;
- remove noindex;
- update the sitemap;
- deploy;
- commit/push;
- open a pull request;
- create test files;
- run browser automation;
- generate screenshots;
- claim release readiness.

Those are separate owner-directed actions.
