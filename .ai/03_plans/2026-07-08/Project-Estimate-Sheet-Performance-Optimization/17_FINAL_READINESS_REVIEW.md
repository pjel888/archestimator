# 17 - Final Readiness Review

## Readiness Verdict

Uses canonical suite statuses (`IMPLEMENTATION-READY` / `CONDITIONALLY READY` / `NOT READY`).

| Scope | Status | Condition |
|---|---|---|
| Phase 0 baseline work | `IMPLEMENTATION-READY` | None — produces evidence artifacts only. |
| Phase 0.5 component-interop verification | `CONDITIONALLY READY` | Requires browser proof for CI-QA-01 through CI-QA-17 (doc 22). |
| Phase 1-6 optimization implementation | `CONDITIONALLY READY` | After Phase 0 ranked bottleneck evidence + Phase 0.5 browser verification. |
| Production scale claim | `NOT READY` | Requires hosted D1 proof, browser stress proof at 5,000 rows, component-interop browser proof, operator/support docs, launch gate. |

## Why Not Fully Ready

The plan is comprehensive enough to begin measurement and component-interop verification, but implementation decisions must be driven by evidence artifacts that do not exist yet:

- No estimate-specific Chrome interaction artifact.
- No estimate-specific D1 query-plan artifact.
- No before/after route fast-path evidence.
- No selector parity tests yet.
- No large-fixture graph/totals proof yet.
- No browser proof for component interop scenarios (CI-QA-01 through CI-QA-17).
- No browser proof for the estimate sheet route's deep interactions (row editing, variant menus, template DnD, virtualization scrolling) — all jsdom-only today.

## Current Code Assessment

Current code is competent and already has important primitives:
- Suspense route loading.
- Lazy panes.
- Capped first-load data.
- TanStack Query seeded data.
- Virtualization (branch + row + tree).
- Render probes and perf tests.
- Subtree-loading primitives.
- Component interop implemented in source (AddComponentModal, EditComponentDrawer, use-estimate-row-handlers, use-estimate-row-mutations) with 63+ passing local vitest tests across 3+ files.

Current code is not yet proven for the desired scale because:
- The route fast path is disabled/stubbed (`readEstimateNodeRouteContextD1FastPath` returns null).
- Nested tree state remains the core shape.
- Whole-tree derivations remain in edit-related paths (see hot-path cost map, doc 24).
- Browser proof is missing for both performance and component-interop.
- D1 proof is generic rather than estimate-specific.
- Client-side project-component fan-out is O(N) tree-walk (GAP-06).
- Restore-deleted throws on D1 (GAP-07) — delete is irreversible on the active substrate.

## Implementation Readiness Checklist

Ready:
- Scope is clear.
- Code areas are mapped (docs 03, 24, 25).
- Target architecture is defined (doc 06).
- Test strategy is defined (doc 12).
- Performance budgets are defined (doc 09).
- D1 proof requirements are defined (docs 07, 03).
- Rollback strategy is defined (doc 13).
- Component-interop identity contract defined (doc 22).
- CRUD surface fully mapped (doc 25).
- Template composition mapped (doc 26).
- DnD architecture mapped (doc 27).

Not ready:
- No Phase 0 measurement artifact yet.
- No ranked bottleneck decision yet.
- No browser proof for component interop yet.
- Open product decisions for global search, huge move-position UX, library-master edit from estimate sheet (GAP-02), and inline component addition UX (GAP-04).

## Component-Interop Readiness Gates (Phase 0.5)

Before claiming MVP readiness for component interoperability, browser verification must pass for all 17 QA scenarios (doc 22):

**Library Component Scenarios** (CI-QA-01 through CI-QA-05c): create with duplicate names; insert; edit (row override + linkState flip + master unchanged); variant pill (library replacement); thumbnail routing; EditComponentDrawer (master mutation); detach.

**Project Component Scenarios** (CI-QA-06 through CI-QA-13): edit with fan-out; identical names; thumbnail fan-out; variant persistence; inline variant pill; raw image path normalization; blank-row express init; promote to library.

**Scale Scenarios** (CI-QA-14 through CI-QA-17): 5,000-row fan-out; stress modal open; stress inline edit; delete-restore limitation.

## Go / No-Go

Go:
- Create Phase 0 evaluator, fixtures, and proof scripts.
- Run baselines.
- Produce a measurement decision memo.
- Create Phase 0.5 browser interop spec (`e2e/estimate-sheet-component-interop.spec.ts`).

No-go:
- Do not start normalized graph migration before baselines.
- Do not add D1 indexes before query-plan proof.
- Do not claim production scale readiness from jsdom tests alone.
- Do not claim component-interop MVP readiness before browser proof.
- Do not expose restore-deleted affordances on D1 (they throw — GAP-07).

## Final Planning Confidence

Confidence: high for Phase 0 and the staged direction.

Confidence: high for component-interop code correctness at small scale (grounded in source audit + vitest evidence).

Confidence: medium for exact later implementation sequencing, pending measurement.

Confidence: not established for component-interop or performance at production scale (requires browser + hosted proof).

Scope risk: broad, because the estimate sheet is central and spans route, data, state, render, mutation, component interop, templates, DnD, collaboration, tests, and provider proof.
