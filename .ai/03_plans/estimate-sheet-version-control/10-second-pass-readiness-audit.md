# 10 Second-Pass Readiness Audit

**Date:** 2026-05-24
**Scope:** Planning-pack refinement only. No application code, migration, generated Supabase types, or tests were implemented in this pass.

**Third-pass note:** This audit is preserved as history. `11-third-pass-readiness-audit.md` supersedes the row-action `ActionMenuGroup` assumption and the `Rev 01` label default after closer code cross-reference.

## Reviewer Feedback Disposition

### Accepted And Applied

- Added concrete UX sketches for row history, sheet history, and compare summary in `02-product-and-ux-plan.md`.
- Specified the actual row-history entry surface: reuse the existing narrow row action column and do not add a new grid column.
- Added explicit reuse guidance for `ActionMenuGroup` and `ContextActionMenuContent`, matching the estimate tree action-menu pattern.
- Defined a concrete compare summary DTO with `totalThen`, `totalNow`, `totalDelta`, `addedRows`, `deletedRows`, `replacedRows`, `editedRows`, and `changedAreas`.
- Made SQL RPC transactions mandatory for row plus history writes. "Prefer RPC" was too weak.
- Added required RPC shapes for row replacement, scalar row update, and named version creation.
- Required target locks with `for update` before computing old snapshots or next version numbers.
- Made delete ordering explicit: snapshot row, insert `row_deleted`, then hard-delete the row inside one transaction.
- Added concrete index definitions for sheet timeline, row history, and version ordering.
- Added snapshot storage guardrails and a `pg_column_size(snapshot)` release check.
- Expanded baseline backfill ordering, including zero-row estimates and idempotent guards.
- Added forward repair and pre-production destructive rollback documentation.
- Split implementation into progressive passes: schema/RPC, atomic event writes, read-only UI, named versions/compare, restore-as-copy, closeout.
- Added effort estimates per pass.
- Added atomicity failure tests, E2E/browser smoke outline, chart aggregation regression, and row-action no-layout-shift checks.
- Moved scalar edit coalescing and version label style from open questions to decisions.
- Added retention and failure UX policy decisions.
- Refreshed GitNexus with `npx gitnexus analyze`; the analyzer reported 4,189 nodes, 8,301 edges, 207 clusters, and 300 flows.

### Reframed Instead Of Directly Applied

- Full visual mockups were not created. ASCII/component sketches were added because this is still a planning artifact and the implementation should use existing workshop primitives.
- A hard feature flag was not required. The sequence now requires a schema/readiness gate by default, with a feature flag left as an implementation option if rollout needs it.
- The closeout document remains reserved. It should not contain fake evidence before implementation.
- Playwright/E2E coverage is planned, but it is gated on reliable protected-route data setup. Schema/RPC and focused Vitest tests remain the earlier proof path.

## Revised Readiness Assessment

Planning completeness is now approximately **86/100**.

The pack is stronger than the first pass because the formerly vague areas now have explicit handoff contracts:

- UX surfaces are sketched and tied to existing row/menu primitives.
- Database writes have transaction boundaries, locks, indexes, backfill order, and failure behavior.
- Implementation is staged into testable passes rather than one long schema-to-UI chain.
- Tests now cover the core false-history/atomicity risk.

It is still **not implementation-ready** until the gates below are satisfied.

## Remaining Blockers

1. Current HEAD/worktree impact analysis must be rerun on exact symbols to edit before implementation begins.
2. Product acceptance is still needed for restore-as-copy and row history first being read-only. The label default was revised in the third pass to `V1`/`V2` compatibility labels plus editable version titles.
3. Supabase migration has not been created.
4. Test feasibility for live RPC atomicity must be verified or replaced with a documented schema/file-content fallback for the first pass.

## Implementation Handoff Rule

The next agent should start at `08-implementation-readiness-gate.md`, not at code. Once the gate is accepted, implement Pass A first and stop for evidence before moving to event-write or UI work.
