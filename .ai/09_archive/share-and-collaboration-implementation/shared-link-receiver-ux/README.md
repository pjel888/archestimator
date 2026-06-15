# Share Page UX/UI Maximization Plan Pack

**Date:** 2026-05-31
**Status:** Planning and audit pack created and second/third-pass hardened. No app code changed.
**Target route:** `http://localhost:3000/share/SHARE_TOKEN_PLACEHOLDER`
**Primary source files:** `src/app/share/[token]/page.tsx`, `src/components/share/*`, `src/lib/publication/*`, `src/lib/share/*`

## Purpose

This folder is the planning surface for improving the public shared-link receiver page. The work is specifically about UX, UI, layout maximization, and future feature planning for `/share/[token]`, not implementation.

The current page is functional, but the receiver experience reads as narrow and centered. Live layout evidence shows the page uses a 1280px capped content container at a 1440px viewport, then gives the primary estimate area about 876px after the right rail and internal tree sidebar. The result is a vertically stacked chart, tabs, tree, and row list where the most important estimate detail starts too low and uses less width than it should.

## Deliverables

| File | Purpose |
| --- | --- |
| `00-north-star-and-success-criteria.md` | Product purpose, target audience, non-goals, success metrics |
| `01-current-implementation-inventory.md` | Route, component, data, API, test, and doc inventory |
| `02-blast-radius-and-dependency-audit.md` | Future change impact map, graph evidence, risk tiers |
| `03-live-layout-and-visual-audit.md` | Rendered desktop/mobile findings and layout measurements |
| `04-ux-paths-happy-sad-edge-cases.md` | User journeys, happy paths, sad paths, edge cases |
| `05-ui-layout-maximization-plan.md` | UI-first layout plan for using the page width better |
| `06-feature-opportunities-roadmap.md` | Prioritized feature opportunities beyond pure layout |
| `07-component-architecture-and-data-plan.md` | Component boundaries, data flow, and primitive reuse plan |
| `08-readiness-risks-open-questions.md` | Readiness assessment, risks, decisions needed before coding |
| `09-validation-qa-acceptance-gates.md` | Future validation matrix and acceptance gates |
| `10-agent-handoff-and-execution-sequence.md` | Implementation handoff sequence for later coding agents |
| `11-personas-jobs-and-scenario-fit.md` | Recipient/manager personas, jobs, anxieties, and feature fit |
| `12-selected-ui-strategy-and-wireframe-contract.md` | Final selected layout strategy with desktop/tablet/mobile wireframe contracts |
| `13-implementation-prd-and-slice-contract.md` | Implementation-grade PRD, slice scope, file ownership, and non-goals |
| `14-third-pass-quality-review.md` | Second/third pass critique log, upgrades made, and remaining checks |
| `15-implementation-test-spec.md` | Slice-by-slice red/green test plan, fixture matrix, and evidence requirements |

## Evidence Captured

Screenshots were captured from the live local route and stored with this plan:

- `evidence/share-page-audit-desktop.png`
- `evidence/share-page-audit-mobile.png`

Measured browser evidence:

| Viewport | Content cap | Main flex width | Estimate pane | Right rail | Page height |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440 x 1000 | 1280px | 1216px | 876px | 320px | 3589px |
| 390 x 844 | 390px | 358px | 358px | 358px stacked | 1122px |

## Current Verdict

The page has a strong foundation: password gating, session-gated comments/decisions, estimate tabs, tree/grid views, a discipline donut, hero image support, and compact design-system styling. The biggest improvement opportunity is not adding another card or decorative section. It is rebalancing the information architecture so the shared estimate behaves like a receiver workspace:

1. Make line items and estimate navigation the primary canvas.
2. Move chart/decision/commentary into contextual rails or panels instead of consuming the vertical lead.
3. Use a wider receiver-specific shell on desktop.
4. Make mobile prioritize readable estimate content over chart-heavy first screen.
5. Preserve view-only, no-auth, no-membership guarantees.

## Selected Strategy After Second Pass

The plan no longer treats shell width, chart location, and rail behavior as open-ended design options. The recommended implementation target is:

```text
Adaptive receiver workspace
  Desktop xl+: wider shell, left navigation rail, central estimate canvas, right context rail
  Desktop lg: wider shell, central estimate canvas plus collapsible context rail
  Tablet: top toolbar plus stacked/collapsible navigation and context panels
  Mobile: project/sheet summary, sheet tabs, Tree/Grid, row content first, chart collapsed below
```

Implementation should start with layout and information architecture, then extract `SharePageTabs` into workspace components, then add search/navigation and response polish. The first slice should not touch public API behavior, schema, token/session security, or Teamspaces membership.

## Mechanical Execution Gates Added After Third Pass

Future coding work must treat these as required gates, not optional guidance:

1. GitNexus/code-review-graph impact procedure before symbol edits.
2. Per-slice entry and exit gates before moving to the next slice.
3. Slice-specific test spec in `15-implementation-test-spec.md`.
4. State truth table for sheet/view/search/rail/decision/comments behavior.
5. Fixture-backed browser evidence beyond the DEMO_PROJECT_PLACEHOLDER snapshot.
6. Explicit file ownership and merge order if multiple agents implement the work.
