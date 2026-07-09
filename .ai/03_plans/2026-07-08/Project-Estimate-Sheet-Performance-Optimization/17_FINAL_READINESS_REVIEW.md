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

## Blind Spots And Known Unknowns (Pass-3 addition)

Honest enumeration of things this plan does NOT yet know. Each item lists the signal that would resolve it.

| ID | Blind spot | Why it matters | Resolution signal |
|---|---|---|---|
| BS-01 | Real Chrome behavior of the virtualized estimate sheet at 5,000 rows. jsdom cannot reproduce layout, paint, or main-thread long tasks. | The entire performance case rests on a measurement that does not yet exist. | Phase 0 browser spec (U0.3) artifact in `evidence/estimate-sheet-browser-profile.json`. |
| BS-02 | Real D1 query plans + `rows_read` for the bound database at stress tier. | Index decisions and free-tier cost decisions require this. | Phase 0 D1 proof (U0.4) artifact with `EXPLAIN QUERY PLAN` for every dominant query shape. |
| BS-03 | Client bundle weight growth after graph store is added. | Adding Zustand-backed graph store, selectors, and entity-patch log may push First Load JS over the budget. | Phase 2 bundle-size artifact; `bun run build` analyzer output. |
| BS-04 | Better Auth session-expiration behavior during long editing sessions. | If sessions expire mid-edit, every server action returns 401 and optimistic rollback cascades (R28). | Targeted integration test: simulate expired session during pending mutation. |
| BS-05 | Durable Object (`COLLAB_ROOMS`) behavior under disconnect/reconnect, slow consumer, and backpressure. | Doc 24 mentions DO but does not specify the protocol. Doc 27 mentions cursor isolation tests but only for 1-3 cursors. | Stress collab scenario in Phase 0.5 or Phase 4: 5+ concurrent cursors + reconnect mid-edit. |
| BS-06 | RSC payload size at 1,500 nodes + 5,000 rows. | The route serializes nested tree to the client; payload size affects TTFB and First Load. | Phase 0 route benchmark artifact captures payload size; if >500KB, escalate. |
| BS-07 | Mobile / tablet behavior of the three-panel layout. | The plan is desktop-first; AGENTS.md targets Philippines/SEA market where mobile-only users are common. | Phase 4 mobile-responsive proof (decision OPEN-07 below). |
| BS-08 | WCAG 2.2 AA conformance for virtualized rows + DnD + collaboration overlays. | Retrofit is expensive if discovered late (R30). | Doc 29 a11y proof matrix validated BEFORE Phase 4 exits. |
| BS-09 | Cloudflare free-tier headroom at projected MVP usage. | AGENTS.md mandates free-tier posture; projected concurrent users × actions/day may approach D1 rows-read/day or Workers requests/day cap. | Doc 09 (Pass-3) free-tier budget table + projection. |
| BS-10 | Real-world fixture realism. The fixture tiers (small/medium/large/stress/limit) are uniform distributions. Real estimates have uneven branch shapes, long-tail attachments, deep nesting, mixed row kinds. | A test that passes on uniform fixtures may fail on real data shapes. | U0.1 fixture generator must include at least one "realistic-shape" fixture modeled on actual estimate samples (sanitized). |

## Open Decision Requiring Product Input (Pass-3 addition)

| ID | Decision needed | Default if unresolved |
|---|---|---|
| OPEN-07 | Mobile/tablet: is the estimate sheet expected to be editable on tablet (≥1024px), view-only on mobile (<768px), or fully editable on mobile? | Default for MVP: tablet-editable, mobile-view-only-with-truncation-UX. Plan must declare this before Phase 4. |

This does not block Phase 0. It affects Phase 4 render boundary scope.
