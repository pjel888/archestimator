# Current State and Product-Proof Audit

## Executive Finding

The repository already contains the correct hero proof but wraps it in the wrong presentation language for the new direction. The redesign should preserve the real sanitized estimate workspace, remove fake browser framing and aurora decoration, replace the rest of the current landing structure, and reserve later product visuals for exact captures or honest neutral slots.

## Route Truth

| Surface | Current source | Planning consequence |
| --- | --- | --- |
| Public root `/` | `src/app/page.tsx:1-22` renders `ArchestimatorNewLandingPage` inside `ProductionPublicPageShell`. | This is the redesign target. Keep server-first route composition and the public shell. |
| Legacy `/new` | `src/app/new/page.tsx:1-24` renders `landing-v3`, with `noindex, nofollow`. | Preserve it as a reversible reference. Do not promote, redesign, or treat its placeholder visuals as proof. |
| Public shell | `src/components/landing-production/ProductionPublicPageShell.tsx:1-19` owns cookie consent and lazy analytics. | Preserve behavior and route ownership. |
| Root providers | `src/app/providers.tsx:1-47` mounts the shared TanStack Query provider. | The hero proof needs no new route provider. |

## Exact Hero Proof

### What is exact

`src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx:18-67,220-320` mounts the real `EstimateWorkspaceClient` with sanitized local fixture data. It owns a deterministic demonstration sequence, query data, cleanup, a static final state, and loop playback. It exposes the real current estimating surface rather than a reconstructed dashboard.

`src/components/landing-production/NewLandingHeroDemo.tsx:17-97` is the route-owned presentation wrapper. It keeps server rendering and the first client render on a static final phase, then permits looping only when the proof is visible, the viewport is desktop-sized, and reduced motion is off.

### What is not exact proof

The wrapper currently adds:

- fake browser traffic-light dots;
- a fabricated `archestimator.com/workshop` URL bar;
- a decorative glow field;
- an outer browser-like frame.

Those elements appear at `src/components/landing-production/NewLandingHeroDemo.tsx:69-95` and corresponding rules in `src/components/landing-production/new-landing.module.css:649-766`. They are presentation chrome, not product UI, and conflict with the new truthful, airy direction. Remove them while preserving the sanitized product demonstration and disclosure.

### User wording reconciled to source

The user asked to keep the exact product mockup they associated with `/new`. Current source shows the exact workspace proof on the production root and legacy placeholder imagery on `/new`. The plan resolves that naming drift by retaining the exact `HeroEstimateWorkspaceMockup` product surface currently used by the root, not by copying the legacy `/new` placeholder composition.

## Legacy Placeholder Boundary

`src/components/landing-v3/ArchestimatorLandingPage.tsx:262-404` includes a fake software placeholder, stock imagery, and a video placeholder. The legacy stylesheet hides the software placeholder on mobile at `src/components/landing-v3/landing-v3.module.css:2352-2382`.

Do not reuse those assets or structures as current product proof. `/new` remains an isolated reference only.

## Later Screenshot Placeholder Contract

The user explicitly permits later product screenshot placeholders, except in the hero. A valid placeholder is a neutral media slot with:

- a fixed aspect ratio matching the future capture;
- a visible label such as `Exact product capture required`;
- a caption naming the route/state the future capture must show;
- no fake toolbar, controls, table, chart, comment, total, or dashboard geometry;
- no animation that implies the missing product behavior exists.

When a non-product diagram is used instead, it must display:

> Conceptual workflow visualization, not product interface

## Current Landing Composition

`src/components/landing-production/ArchestimatorNewLandingPage.tsx:53-88` currently renders hero, outcomes, audience, bento product content, connected-record diagrams, activity, principles, connection matrix, early access, FAQ, final CTA, and footer. It is content-heavy and repeats similar product claims across several card/grid patterns.

The replacement should keep only source-backed claims, the exact hero, the three strongest value pillars, one central workflow story, a concise connected-record explanation, beta/FAQ, and the closing CTA.

## Current Copy Truth

`src/components/landing-production/new-landing-content.ts:54-335` is the current public copy registry. It supports these defensible themes:

- structure estimates around real project hierarchy;
- reuse costs, components, suppliers, assumptions, and source notes;
- present proposals or familiar spreadsheet output;
- keep review, revisions, and decisions attached to the same commercial record;
- maintain Excel as part of the workflow rather than claiming to replace it;
- describe pre-release beta access without exposing internal approval mechanics.

The redesign may condense and sharpen those themes. It may not add unsupported AI, BIM, automated takeoff, integrations, customers, metrics, pricing, awards, public availability, or time-savings claims.

## Existing Material and Motion Infrastructure

### Glass

`src/app/globals.css:242-317,1510-1551` defines shared glass variables and workshop/dashboard glass surfaces. The current performance contract favors one blur layer per region. The landing may reuse the material logic, but not the authenticated density or glass-card language.

### Motion

- `src/components/landing-production/NewLandingMotionController.tsx` is the current route-local GSAP pattern.
- `src/components/landing-v3/HeroMountMotion.tsx` provides another route-local lifecycle example.
- `package.json` already includes `gsap`, `@gsap/react`, `three`, and `@types/three`.

No dependency addition is required.

## Framework Boundary

The installed Next.js 16 lazy-loading guide states that `ssr: false` must be declared from a Client Component boundary. If the central WebGL island uses `next/dynamic`, place the dynamic import in a small client-owned wrapper rather than the server page composition. Core copy, fallbacks, and section structure remain server-rendered.

## Worktree Boundary

Observed unrelated work must remain untouched:

- modified `src/app/admin/observability/page.tsx`;
- untracked `src/app/3d/`;
- any later human or agent edits outside the landing-plan and landing-production paths.

The old source prompt at `.ai/08_prompts/kimi-landing-page.md` is moved into this pack as `KIMI-IMPLEMENTATION-PROMPT.md` and removed from the old prompt directory.

## Stale Plan-Pack Boundary

`.ai/03_plans/2026-07-21/archestimator-new-landing-plan-pack/` assumed `/new` was a blank isolated target and described source that has since changed. Its reference choices, route assumptions, and unit order are superseded by this pack. It may be consulted for historical context only and must not be resumed as the active landing implementation plan.

