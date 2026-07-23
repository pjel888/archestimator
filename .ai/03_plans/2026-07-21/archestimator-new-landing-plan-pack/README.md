# Archestimator `/new` Landing Page Plan Pack

> **Superseded 2026-07-23:** Do not resume this pack. Current source no longer matches its blank-`/new` route assumption. Use `.ai/03_plans/2026-07-22/landing-page-improvement/` for the active root-landing plan and Kimi implementation prompt.

**Package ID:** `PLAN-2026-07-21-new-landing-page`  
**Target repository:** `pjel888/archestimator`  
**Target route:** `/new` only  
**Package status:** superseded by `PLAN-2026-07-22-landing-page-improvement`; implementation not started
**Canonical execution document:** [`09-implementation-units.md`](./09-implementation-units.md)  
**Prepared:** 2026-07-21

## Purpose

This pack is the complete implementation handoff for rebuilding the existing blank `/new` preview route as a light, product-led Archestimator landing page.

The requested design direction is intentionally specific:

1. Preserve the **macrostructure and pacing** of the Velora UI SaaS landing template.
2. Translate that structure into a **light, precise, commercially credible Archestimator visual system**.
3. Reuse the **real sanitized Archestimator estimate-workspace demonstration** already rendered in the current landing hero.
4. Use LaunchPad only for **motion and microinteraction cues**, not for code, assets, branding, or copy.
5. Replace every reference-template claim with **truthful Archestimator content grounded in the current repository and canonical Notion corpus**.
6. Keep the page focused. It must explain the product without becoming a feature catalogue, roadmap, or long-form manifesto.
7. Keep all work isolated to `/new`; the current `/` route remains unchanged.

This is a planning package, not an implementation patch. No application code, dependencies, configuration, provider state, route behavior, database state, or Git history was changed while preparing it.

## Non-negotiable result

The finished `/new` route must make a first-time AEC visitor understand, in order:

- what Archestimator is;
- why the estimate-to-proposal handoff is the product wedge;
- how real product structure, reusable cost knowledge, proposal context, review, revision, and decisions stay connected;
- that Excel remains a useful output rather than a declared enemy;
- that Archestimator is a pre-release MVP;
- how to request early access.

The page must not rely on invented numbers, fabricated logos, anonymous “customer” quotes, fake ratings, unsupported tracking claims, public pricing, AI positioning, procurement, payments, or marketplace language.

## Start here

A codebase AI implementing this plan should read the pack in this order:

1. [`00-executive-brief.md`](./00-executive-brief.md)
2. [`01-evidence-and-source-of-truth.md`](./01-evidence-and-source-of-truth.md)
3. [`02-current-codebase-audit.md`](./02-current-codebase-audit.md)
4. [`04-page-architecture-and-content-density.md`](./04-page-architecture-and-content-density.md)
5. [`05-copy-deck.md`](./05-copy-deck.md)
6. [`06-visual-design-system.md`](./06-visual-design-system.md)
7. [`07-motion-and-microinteractions.md`](./07-motion-and-microinteractions.md)
8. [`08-component-and-file-architecture.md`](./08-component-and-file-architecture.md)
9. [`09-implementation-units.md`](./09-implementation-units.md)
10. [`12-validation-and-acceptance.md`](./12-validation-and-acceptance.md)

The remaining documents provide focused reference material and recovery state.

## Repository startup contract

Before touching source, follow the repository’s own agent contract:

```bash
bun run supermemory:ensure
# Read only the FAST PATH block in .ai/10_state/current-state.md.
git status --short --branch
```

Then import this package under an active plan location such as:

```text
.ai/03_plans/2026-07-21-new-landing-page/
```

Do not create or switch branches, commit, push, deploy, or mutate any external system unless the owner separately requests those actions.

## Test authorization boundary

The repository explicitly treats automated tests, builds used as test gates, browser automation, screenshots, Storybook, and visual QA as owner-controlled work. The request that produced this pack asked for a plan, not testing.

The default verification lane in this pack is therefore:

- source inspection;
- scoped diff review;
- TypeScript checking;
- ESLint;
- static accessibility and claim audits;
- the repository’s plan-pack contract validator after import.

Potential browser, build, and automated-test commands are documented only as `TEST_PROPOSAL` items in [`12-validation-and-acceptance.md`](./12-validation-and-acceptance.md). Do not run or create them until the owner explicitly authorizes testing for the implementation task.

## Pack map

| File | Role |
|---|---|
| `README.md` | Entry point, operating rules, document map |
| `00-executive-brief.md` | Outcome, scope, design thesis, fixed decisions |
| `01-evidence-and-source-of-truth.md` | Canonical sources, capability truth, claim guardrails |
| `02-current-codebase-audit.md` | Route, hero, providers, CTA, metadata, dependency, and blast-radius audit |
| `03-reference-template-deconstruction.md` | Velora section map and LaunchPad interaction-cue map |
| `04-page-architecture-and-content-density.md` | Exact section order, responsibilities, density limits, heading structure |
| `05-copy-deck.md` | Approved page copy, labels, FAQs, metadata, prohibited copy |
| `06-visual-design-system.md` | Scoped tokens, typography, layout, surfaces, component states |
| `07-motion-and-microinteractions.md` | Motion runtime decision, timings, reduced-motion and lifecycle behavior |
| `08-component-and-file-architecture.md` | Target files, component APIs, server/client boundaries, data contracts |
| `09-implementation-units.md` | Dependency-ordered implementation plan; canonical execution artifact |
| `10-responsive-accessibility-performance.md` | Breakpoint behavior, accessibility invariants, budgets, mobile hero treatment |
| `11-seo-analytics-and-route-guardrails.md` | Noindex preview behavior, CTA analytics, sitemap and promotion boundaries |
| `12-validation-and-acceptance.md` | Requirement-to-acceptance matrix and permitted evidence paths |
| `13-risk-register-decisions-assumptions.md` | Decision log, assumptions, risks, triggers, mitigations |
| `14-handoff-resume-and-completion-audit.md` | Exact next unit, resume protocol, completion report, stale triggers |
| `15-third-party-notice-and-license.md` | Velora MIT obligations and LaunchPad no-copy boundary |
| `16-annotated-wireframes.md` | Desktop and mobile textual wireframes with layout annotations |
| `17-package-validation-report.md` | Local integrity checks, unrun official validation, and import instructions |
| `plan-pack.json` | Machine-readable traceability and artifact integrity manifest |
| `checksums.sha256` | Transport-integrity hashes for all package files |

## Fixed implementation surface

The expected source tree is intentionally small:

```text
src/app/new/page.tsx
src/components/landing-new/
  ArchestimatorNewLandingPage.tsx
  NewLandingHeroDemo.tsx
  NewLandingMotionController.tsx
  NewLandingPrimitives.tsx
  new-landing-content.ts
  new-landing.module.css
```

One existing shared file may receive a backward-compatible extension:

```text
src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
```

Its current behavior must remain the default so the live `/` route does not change.

Do not modify the current `/` page, its copy, the pricing route, the contact route, the sitemap, global brand tokens, authenticated-route components, provider configuration, or application data unless a concrete implementation dependency proves the change unavoidable. Ordinary convenience is not sufficient justification.

## Completion definition

Implementation is complete only when every core acceptance criterion in [`12-validation-and-acceptance.md`](./12-validation-and-acceptance.md) is reconciled against fresh evidence.

At minimum, the completed source must show that:

- `/new` renders a full static landing page and remains `noindex,nofollow`;
- the live `/` route is untouched;
- the section order maps to Velora’s SaaS template without carrying over its fake proof or pricing story;
- the hero uses the current sanitized Archestimator product demonstration;
- the product demonstration remains visible on mobile in a static state instead of disappearing;
- approved Notion language and “Request early access” are used;
- no unsupported claims or customer proof appear;
- motion is restrained, pauses when not useful, and has a complete reduced-motion path;
- no new animation runtime is introduced;
- public CTA analytics and cookie-consent behavior remain connected;
- the page has no known horizontal-overflow, focus, contrast, or layout-shift defect in source;
- the implementation report names any unrun test proposal honestly.

## Package integrity

`plan-pack.json` records each Markdown artifact and its SHA-256 digest. `checksums.sha256` provides a transport-level digest list. After moving the package into the repository, refresh the baseline fields and run:

```bash
bun run validate:plan-pack .ai/03_plans/2026-07-21-new-landing-page
```

That repository validator is a static document-contract gate, not an application test. If the package is edited, update affected record states and evidence before refreshing hashes; do not silently preserve stale proof claims.
