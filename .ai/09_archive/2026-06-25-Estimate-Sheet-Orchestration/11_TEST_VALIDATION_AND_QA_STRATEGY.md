---
title: Test Validation and QA Strategy
type: docs
date: 2026-06-25
---

# Test, Validation, and QA Strategy

## Validation Posture

Test health: needs attention.

The future implementation must use targeted RED->GREEN evidence as the merge blocker. Full `bun run validate` remains important, but current baseline noise means it should be run as a final/interpretable release signal with failures classified as pre-existing or new.

## Priority Gates

| Priority | Surface | Required Proof | Release Blocking |
|---|---|---|---|
| P0 | Center atomic component move | SQL/RPC proof, generated types, server-action test, DOM race/failure test | Yes |
| P0 | Center bulk row delete | SQL/RPC proof, mixed-revision failure injection, truthful recovery UI | Yes |
| P0 | Tree mutation authorization | Action/RPC/RLS tests for editor success, viewer denial, cross-workspace rejection | Yes |
| P0 | DB/authz preflight | Supabase project ref, live function signature/grant/RLS/constraint/index inventory, dump scope | Yes before migration work |
| P0 | RPC security posture | SECURITY INVOKER/DEFINER choice, owner, `SET search_path`, least-privilege `EXECUTE`, FORCE RLS/table-policy interaction, and role tests recorded for each changed function | Yes before migration/client merge |
| P0 | Telemetry sink proof | Storage/table/sink exists or manual rollout downgrade is recorded; redaction allow-list tested | Yes before rollout claims |
| P1 | Project-source insert race | Deferred-response DOM test proves newer local edit survives stale returned tree | Yes |
| P1 | Right persistence honesty | Refresh/DB proof plus viewer/public/share/cross-workspace denial for archive/delete/restore/edit/duplicate or absence of affordance | Yes |
| P1 | Latest-wins and bounded search | Deferred promise DOM test, malformed/oversized query tests, bounded result proof, and no raw query telemetry | Yes |
| P1 | Read-only matrix | Keyboard/pointer/drag/custom-event tests | Yes |
| P1 | Tree signature | Pure unit plus row-edit integration | Yes |
| P1 | A11y semantics | DOM/axe/live-region/table/tree assertions | Yes for claimed readiness |
| P2 | Browser-only interaction | Playwright for real drag/drop, keyboard DnD, focus trap/drawer, virtualization focus | Claim-dependent |
| P2 | Performance | Payload/render budget tests and large-data smoke | Before beta rollout |
| P2 | Telemetry/rollback | Unit/static/SQL event checks and rollback drill | Before release |

## Numeric Performance Budgets

These are release gates for the future implementation pass:

| Surface | Budget | Command |
|---|---|---|
| Tree drag-hover validation | Average hover validation is below 16ms at 1,000 nodes, below 50ms at 5,000 nodes, and below 50ms at 10,000 nodes. | `bun x vitest run tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1` |
| Initial estimate sheet load | Initial route/action caps remain `maxNodeCount: 1500` and `maxRowItemCount: 5000`; truncation copy remains present. | `bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1` |
| Reusable source search | Server-side caps remain at 50 projects, 200 estimates per project, 300 node matches, 120 tab matches, 25 materialized estimates, 75 tabs per estimate, 600 tree nodes, and 1,200 row items per materialized tree. | `bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1` |
| Project/template filtering | The 50-project synthetic filtering case remains below 1,000ms over five repeated runs. | `bun x vitest run tests/vitest/templates-tree-performance.test.ts --maxWorkers=1` |
| Center virtualized editing | 50-row and 500-row render profiles keep the edited input focused and produce stable render counts for comparison; regressions require an owner-recorded exception. | `bun x vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1` |

## RED->GREEN Plan

1. Add failing tests/proofs before implementation for each phase.
2. Keep tests narrow enough to identify the changed behavior.
3. Run focused commands first, then adjacent regression files.
4. After integration, run type-check, lint/design checks, targeted DOM/unit suites, and broad validation if time/risk justifies.
5. Record all skipped checks with reason and residual risk.

## Required Test Families

Center:

- `estimate-sheet-move-component-atomicity`
- `estimate-sheet-bulk-delete-atomicity`
- `estimate-sheet-project-source-insert-race`
- `estimate-sheet-trust-gate-stale-target`
- `estimate-sheet-readonly-mode`
- Row save status/live-region tests.
- Virtualized editor pinning tests.

Exact starting commands:

- `bun x vitest run tests/vitest/estimate-sheet-row-details-crud.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-row-tree-patch.test.ts --maxWorkers=1`

RED expectation: tests fail or new focused tests fail on current two-RPC move, per-row bulk delete, stale project-source returned tree, or missing read-only gate. GREEN expectation: named focused tests pass plus type-check for changed types.

Tree:

- Permission gate/action tests.
- Delete cascade/fallback tests.
- Content signature tests.
- Reorder payload/sort tests.
- Create/prop-queue/rename failure tests.
- Keyboard DnD/tree navigation tests.
- Share header/referrer policy tests.

Exact starting commands:

- `bun x vitest run tests/vitest/estimate-tree-reorder.test.ts --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-tree-edit.test.ts --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/tree-external-drop.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/ui-tree.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/share-no-store-invariants.test.ts tests/vitest/shared-link-header-smoke-script.test.ts --maxWorkers=1`

RED expectation: current row-field signature, authz gaps, or header/referrer gaps fail new assertions. GREEN expectation: row-only edits no longer trigger tree reconciliation, viewer mutations fail, and token-bearing routes satisfy selected header policy.

Right:

- Archive/restore refresh tests.
- Edit persistence tests.
- Duplicate persistence tests.
- Template group affordance removal tests.
- Snapshot copy labels/toasts.
- Project-source latest-wins search.
- Viewer/public/share/cross-workspace negative tests for touched component-library write actions.
- Search query min/max bounds, page-size/result caps, workspace scoping, debounce/cancel, and no raw-query telemetry assertions.
- `AddComponentModal` edit identity characterization.

Exact starting commands:

- `bun x vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/component-library-actions-revalidation.test.ts --maxWorkers=1`
- `bun x vitest run tests/vitest/library-source-trust.test.ts --maxWorkers=1`
- `bun x vitest run tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1`
- `bun x vitest run tests/vitest/library-tab-a11y.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/library-template-insert-picker.test.tsx --maxWorkers=1`

RED expectation: current local-only CRUD/search race/snapshot-copy gaps fail; new negative tests fail if direct calls can write as viewer/public/share/cross-workspace or if raw search text enters telemetry. GREEN expectation: refresh proves persistence or affordance removal, latest query wins, bounded search fails closed, authz negatives pass, and telemetry sink behavior is explicit.

Cross-surface:

- Shared drag payload parser.
- Custom event validation/rejection.
- Trust gate success/recents semantics.
- Read-only keyboard/drag/custom event denials.
- Telemetry redaction and event emission.
- RPC security posture checks for invoker/definer choice, `SET search_path`, `EXECUTE` grants, FORCE RLS/table-policy interaction, and role-based denials.

Release-blocking threshold:

- P0/P1 targeted tests must pass before the relevant phase can merge.
- Browser/manual/provider proof remains "not yet present" until evidence is captured in the implementation ledger or before/after report.
- Broad `bun run validate` failures must be classified as pre-existing or newly introduced before release.

## Browser and Manual Proof Rules

Use browser proof only when it proves something source/DOM tests cannot:

- Native drag/drop behavior.
- Keyboard DnD in the browser.
- Virtualized focus after scroll.
- Drawer/focus-trap responsive behavior.
- Network throttling/offline behavior.
- Screen-reader smoke with NVDA/Chrome and VoiceOver/Safari.

Do not use browser runs as a substitute for SQL transaction proof, server-action authorization proof, or unit tests.

## Known Gaps

- No current SQL prove harness exists for new center RPCs.
- Telemetry storage/table/dashboard existence is not yet proven.
- Live Supabase schema/function signatures must be rechecked before implementation; source-plan SQL is not executable proof.
- No manual NVDA/VoiceOver proof exists.
- No large-data browser proof exists for 1,000-row/1,000-node stress.
- Some existing tests likely encode current broken behavior and must be inverted or replaced.
