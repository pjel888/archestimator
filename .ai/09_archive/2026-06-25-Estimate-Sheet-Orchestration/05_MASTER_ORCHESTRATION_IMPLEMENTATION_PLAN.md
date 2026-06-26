---
title: Master Orchestration Implementation Plan
type: docs
date: 2026-06-25
status: final-verified
---

# Master Orchestration Implementation Plan

## Operating Model

Future implementation should run as orchestrated multi-agent work with a lead integrator. The lead owns sequencing, shared contracts, merge order, validation evidence, and rollback. Area agents own disjoint file scopes only after shared contracts are frozen.

Default validation shape: RED test/proof, implementation, targeted GREEN, integration check, evidence record. Broad `bun run validate` is a final signal, not the first merge blocker, because the current baseline can be noisy.

## Phase MOP-0: Common Control Plane and DB/Authz Preflight

Purpose: remove ambiguity and prove the database/release control baseline before code edits.

Tasks:

- Record current `git status`, existing source-plan changes, and known validation baseline.
- Confirm Supabase project boundary is `ebxxqidacheyapmmzavr`; abort if any DB command targets another project.
- Inspect live function signatures, grants, RLS policies, constraints, indexes, and generated types before writing migration SQL.
- Decide which affected tables/functions require manual logical dumps before destructive or high-risk migration work because PITR is intentionally disabled.
- Choose RPC names for center atomic row move and bulk row delete.
- Define feature flags/rollback controls using existing project patterns unless insufficient.
- Prove or create one telemetry storage/sink for row move, bulk delete, project-source insert mismatch, trust-gate stale target/source, malformed drag/custom events, right-sidebar persistence actions, and tree mutation failures.
- Define telemetry redaction: no raw names, URLs, queries, filenames, file paths, supplier/component free text, or other PII.
- Define permission matrix for editor/viewer/public/share/stale/locked/no-estimate states across center, tree, right, drag, keyboard, context menus, and custom events.
- Define shared event contracts for `archestimator:add-library-item`, `INSERT_ESTIMATE_TEMPLATE_EVENT`, `INSERT_PROJECT_SOURCE_EVENT`, and `CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT`.
- Define snapshot-copy copy and success/recents semantics.
- Assign single owners for migrations, `src/lib/estimates/actions.ts`, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `component-library/index.tsx`, `ui/tree.tsx`, `src/proxy.ts`, and telemetry.

Exit criteria:

- Contract doc checked in and telemetry sink/table decision recorded.
- Project boundary and live schema/RLS/grant baseline recorded.
- Future branch has no ambiguous shared-file owner.
- Targeted RED tests/proofs are named before implementation starts.

### MOP-0 Required Permission Matrix

The implementation contract must fill this matrix before code work. Defaults are binding unless MOP-0 records a narrower owner decision.

| State | Center grid cells/buttons | Tree actions/context menu | Right dock browse/search/preview | Right dock create/edit/delete/duplicate | Drag/drop/custom events/keyboard mutations |
|---|---|---|---|---|---|
| Editor | Enabled when target/source are fresh and row/node is writable. | Enabled after server-side edit authority proof. | Enabled. | Enabled only through server actions with workspace ownership checks. | Enabled only through guarded parsers and permission checks. |
| Viewer | Visible but disabled with reason for mutating controls; read-only totals/details remain available. | Mutating actions disabled with reason; selection/navigation allowed. | Browse/search/preview allowed when scoped to the viewer's authorized workspace/project. | Disabled or hidden with reason; direct server calls denied. | No-op with telemetry; direct server calls denied. |
| Public/share | No mutation controls; public read surface only. | No edit affordances; share-token header/referrer policy applies. | Only explicitly public-safe previews, if any; otherwise unavailable. | Hidden; direct server calls denied. | No-op without leaking token/source details; direct server calls denied. |
| Stale/locked | Editing paused with stale/locked reason and recovery path. | Mutating actions disabled until refresh/retry succeeds. | Browse/search may continue; insertion/editing disabled. | Disabled until lock clears. | No-op with stale/locked telemetry. |
| No estimate/invalid target | Empty/degraded state; no row mutation. | Navigation only when route target is valid. | Browse/search may remain available; insertion disabled. | Disabled unless operating in global library manager context. | No-op with invalid-target telemetry. |

## Phase MOP-0.5: Quick UI/A11y Preflight

Purpose: preserve source-plan quick-win semantics without delaying them behind heavier DB and accessibility phases.

Allowed scope:

- Tree empty CTA and visible empty states.
- Stable `aria-controls` and sidebar panel ids.
- Rename input height/token fixes that do not affect data flow.
- `useParams` route parsing cleanup if isolated.
- Scroll newly created node into view only if it does not change mutation semantics.
- Right/sidebar hit-target or focus fixes with no persistence/API impact.
- Copy-only fixes that clarify desktop-first fallback or snapshot-copy language.

Rules:

- MOP-0 ownership locks must be complete first.
- Do not edit `src/lib/estimates/actions.ts`, migrations, generated types, or persistence paths.
- Do not touch shared `ui/tree.tsx` keyboard/DnD behavior without MOP-4 primitive ownership.
- If a quick win collides with MOP-1 through MOP-3 owned files, defer it to that owner.

Exit criteria:

- Targeted DOM/static tests pass for changed UI.
- No mutation semantics, schema, event contract, or server-action behavior changed.

## Phase MOP-1: Right Sidebar Persistence Honesty

Purpose: land the easiest visible trust win behind a flag while DB-heavy center/tree work remains single-owner and proof-driven.

Owner: right sidebar agent, with release/telemetry owner.

Tasks:

- Verify telemetry storage before wiring events.
- Characterize `AddComponentModal` edit/prefill identity semantics.
- Route component archive/delete, restore, edit, and duplicate through persisted server paths.
- Require every touched component-library server action, including archive/delete/restore/edit/duplicate and any folder-management fallback, to enforce server-side edit authority and workspace ownership before writes.
- Use lifecycle archive, not hard delete.
- Remove local-only template group creation.
- Replace live/read-through language with snapshot-copy language and transition explainer.
- Add latest-wins request identity for project-source search.
- Enforce search abuse/privacy limits: workspace scoping, explicit viewer/public/share access decisions, minimum and maximum query length, bounded page size/result limits, client debounce/cancel behavior, and no raw query text in telemetry.
- Rename Project tab to Project Components if still selected.
- Keep project-source insertion safety claims blocked on MOP-2 center revision-gate proof.

Exit criteria:

- Right-sidebar honesty tasks are behind `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` or selected equivalent.
- Refresh proves persisted archive/delete/restore/edit/duplicate.
- Viewer, public/share, and cross-workspace negative tests plus RLS/grant proof pass for every touched right-sidebar write path.
- Search race, malformed-input, oversized-query, result-limit, and no-raw-query-telemetry tests pass.
- No local-only CRUD action looks persistent.

## Phase MOP-2: Center Integrity and Trust Gates

Purpose: fix the highest-risk center data and trust paths.

Owner: one backend/data owner for RPC/action contracts plus one center owner for UI wiring.

Tasks:

- Add project-source revision gate before any parallel center/tree insert work that can return a full tree.
- Add/prove atomic center row component move with deterministic row-lock order, both expected row revisions, idempotent correlation id, `row_moved` history event, row-count cap, editor/viewer/cross-workspace checks, and generated Supabase types.
- Add/prove all-or-nothing center bulk row delete if that UI remains; reject `Promise.all`, savepoint partial success, and compensating rollback.
- Add stale target/source freshness handling in trust gate.
- Gate row controls, drag sources, drops, keyboard picker, custom events, and sidebar callbacks for read-only.
- Add row-level save/failure chips and live-region announcements after mutation results are stable.
- Add destructive language fixes and virtualization active-editor pinning after data fixes.

Exit criteria:

- SQL/RPC prove scripts, generated types, server-action tests, and center DOM tests pass.
- No stale full-tree overwrite under deferred response.
- No partial move/bulk persistence.
- Rollback/fix-forward instructions exist before client wiring merges.

## Phase MOP-3: Tree Security, Delete Authority, and DB Invariants

Owner: tree agent plus the same data owner for migrations/types.

Tasks:

- Add explicit `assertCanEditEstimate` coverage to tree mutation server actions.
- Update tree delete return shape to server-authoritative values or explicitly gate/delete defer with owner acceptance.
- Fix share/cache/referrer policy for token-bearing routes as required.
- Change tree content signature to structure-only, including fields needed for navigation correctness such as id/path, kind, name, parent, sort order/tab.
- Fix create/selection race, pending prop queue, rename failure recovery, delete fallback, and expansion persistence.
- Decide and implement tree sort-order scheme only after preflight proves risk; if numeric/sparse migration proceeds, code must accept and preserve numeric values before writes ship.
- Add max-depth and sort-order safeguards in client and server where selected.

Exit criteria:

- Tree action/RPC/authz tests pass.
- Row-only center edits do not clobber tree state.
- Shared tree primitive regressions for right sidebar are covered before merge.
- Numeric/sparse sort rollback is fix-forward unless logical dump recovery is selected and tested.

## Phase MOP-4: Shared Interaction and Feedback Contracts

Purpose: prevent center/right/tree integration drift after core mutation semantics are stable.

Owner: contract/integration agent.

Tasks:

- Implement shared guarded library drag payload reader and event-detail validators.
- Make malformed payloads/custom events no-op with telemetry and no mutation.
- Gate all mutation entry points using the MOP-0 permission matrix.
- Ensure recents/success UI updates only after actual persistence/insert success.
- Align project-source insert target semantics between tree dispatch, right UI, and center consumer.
- Lock snapshot-copy copy, keyboard equivalence model, mutation feedback, cache reconciliation, and selection recovery.

Exit criteria:

- Parser/event tests pass.
- Viewer/read-only/custom-event tests pass.
- Right and tree emitters conform to center consumers.

## Phase MOP-5: Accessibility, Responsive Fallback, Performance, and Observability

Owner: UX/a11y agent with primitive owner for shared UI, plus reliability/perf/ops owner.

Tasks:

- Keep grid dominance: right dock normal width near design range; wider states temporary/resizable/overlay.
- Add below-1024 fallback now; drawer/sheet only if scoped with focus trap and browser proof.
- Add table header scope/index/live region semantics and test them.
- Add tree keyboard support: F2 rename, Shift+F10/context, typeahead, Left/Right completeness, and an explicit Move dialog opened from the context/action menu.
- Add command-palette-style keyboard alternatives for center replace/move: row action opens a picker of valid targets/sources, Enter confirms, Escape cancels, invalid targets are disabled with reason, and outcomes match drag/drop persistence semantics.
- Ensure focus restoration after create, rename, delete, modal close, insert, failed mutation, and virtualized row focus.
- Ensure only one active bottom bulk dock is visually dominant at a time.
- Add payload and render-budget tests for tree reorder, right search, and center virtualized rows.
- Confirm telemetry event redaction and dashboard/alert/daily review owner.
- Run rollback drill for flags and RPC/migration fix-forward path.
- Capture large-data local benchmarks and classify provider/runtime gaps.
- Hold beta rollout for agreed 48-hour observation window if user-facing change is released.

Exit criteria:

- DOM/a11y tests pass.
- Browser proof exists for keyboard DnD, focus trap/drawer, native drag/drop, virtualization focus, or responsive claims that cannot be proven statically.
- Performance budgets pass or documented exceptions are accepted.
- Rollback/fix-forward evidence exists.
- Telemetry can answer whether integrity fixes work for users.

### Below-1024 Fallback Contract

Until a scoped drawer/sheet implementation with focus-trap proof is approved, the below-1024 contract is an honest fallback, not full mobile editing:

| Viewport | Primary behavior | Tree/right access | Copy and focus | Required proof |
|---|---|---|---|---|
| `1023px` tablet boundary | Center grid remains primary. Editing may remain enabled only if columns, focus rings, and mutation feedback fit without overlap. | Sidebars start collapsed or link to desktop-sized workspace controls; no silent loss of required actions. | Initial focus remains on the page heading or selected row; fallback copy says sidebar tools are limited at this width. | DOM/responsive test for no overlapping controls and visible fallback copy. |
| `768px` narrow tablet | Center grid is read-first; mutation controls that cannot fit are disabled with reason instead of hidden. | Tree/right dock actions are unavailable unless a drawer is explicitly implemented and browser-proved. | Focus lands on the fallback notice, then the grid; keyboard can leave the notice. | DOM test for disabled reasons and focus order. |
| `375px` phone | No dense editing claim. Show a read-only estimate summary/grid preview plus clear copy to use a wider screen for full editing. | Tree/right dock tools are unavailable in this slice. | Focus lands on the summary heading; no off-screen required controls. | Static/DOM responsive proof; browser proof only if a drawer/sheet is added. |

Drawer/sheet work is deferred. If implementation chooses to add it, that becomes a MOP-5 browser-proofed sub-scope with focus trap, escape/close, return focus, scroll lock, and screen-reader smoke evidence.

### Selected Keyboard Move Model

The selected v1 keyboard model is explicit picker/dialog movement, not freeform keyboard drag-and-drop:

| Surface | Entry | Target picking | Confirm/cancel | Announcement | Parity |
|---|---|---|---|---|---|
| Tree node move | Context menu or action menu `Move...`; shortcut may open the same dialog after focus is on a node. | Searchable/arrowable tree of valid destinations; invalid destinations disabled with reason. | Enter confirms; Escape cancels and returns focus to the source node. | Polite: `Moved {node name} to {parent name}`; assertive on failure. | Uses the same server reorder/move path as pointer interactions. |
| Center row/component replace | Row action `Replace component...` or command palette. | Searchable component/source picker scoped to authorized workspace/project. | Enter confirms; Escape cancels and returns focus to the source row cell. | Polite on success; assertive on stale target/source or failed save. | Uses the same atomic move/replace and trust-gate semantics as pointer/drag. |
| Center row/component move | Row action `Move component...` or command palette. | Valid area/row targets only; invalid targets disabled with reason. | Enter confirms; Escape cancels and returns focus to the source row cell. | Polite on success; assertive on failure. | Uses the same atomic move RPC as drag/drop. |

### A11y State and Focus Matrix

| Event | Live region | Required announcement intent | Focus result |
|---|---|---|---|
| Row save pending | Polite | Saving row changes. | Focus stays in the edited cell/control. |
| Row save success | Polite | Row changes saved. | Focus stays in the edited cell/control; no success toast steals focus. |
| Row save failure | Assertive | Row changes could not be saved; prior value restored or retry available. | Focus returns to the failed field or retry control. |
| Stale conflict | Assertive | Changes are stale; refresh or retry before editing. | Focus moves to the conflict recovery control. |
| Selection pruned/deleted | Polite | Selection changed because rows/nodes were removed. | Focus moves to the next valid row/node or the containing heading. |
| Row inserted | Polite | Row inserted in the target area. | Focus moves to the inserted row's first editable field when editing is allowed. |
| Row deleted | Polite | Row deleted. | Focus moves to the next row, previous row, or empty-state action. |
| Tree node renamed | Polite | Node renamed. | Focus returns to the renamed tree item. |
| Virtualized row restored | Polite only if user-visible | Editing focus restored after scroll. | Focus returns to the active editor; if unavailable, to the row action. |

### Performance Budget Contract

Performance claims must be numeric and source-backed. These budgets are the minimum v1 acceptance line; future implementation may tighten them but cannot ship a weaker budget without an owner-recorded exception in the implementation ledger.

| Surface | Budget | Existing Anchor / Command |
|---|---|---|
| Tree drag hover validation | Average hover validation stays below 16ms at 1,000 flat nodes, below 50ms at 5,000 nodes, and below 50ms at 10,000 nodes. | `bun x vitest run tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1` |
| Estimate sheet initial tree load | Sheet route and action load caps remain `maxNodeCount: 1500` and `maxRowItemCount: 5000`; truncation copy remains visible when limits apply. | `bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1` |
| Reusable project-source search | Search remains capped at 50 projects, 200 estimates per project, 300 node matches, 120 tab matches, 25 materialized estimates, 75 tabs per estimate, 600 tree nodes, and 1,200 row items per materialized tree. | `src/lib/reusable-sources/actions.ts`; `bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1` |
| Template/project-source filtering | Filtering the 50-project synthetic source set remains below 1,000ms across five repeated runs and returns only scoped matches. | `bun x vitest run tests/vitest/templates-tree-performance.test.ts --maxWorkers=1` |
| Center virtualized editing | 50-row and 500-row render baselines keep the edited input focused and produce an interpretable render profile; regressions require a recorded budget exception or optimization task before beta. | `bun x vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1` |

If a perf check is intentionally skipped, the implementation ledger must record the reason, dataset size, affected surface, and whether beta/release is blocked.

## Phase MOP-6: Post-Launch Maintainability

Owner: simplification/refactor agent after behavior proof.

Tasks:

- Decompose `EstimateSheetContent.tsx` only after tests lock behavior.
- Extract right-sidebar reducer/hooks only after persistence honesty lands.
- Clean old terminology only in approved cleanup phase; do not rename DB/RPC/file keep-list accidentally.
- Revisit account-synced preferences, mobile drawers, delete undo, lazy subtree loading, realtime collaboration, and product enhancements.

Exit criteria:

- Refactors do not change behavior.
- Existing tests remain green.

## Future Workstream Map

| Workstream | Owner Role | Primary Scope | May Run In Parallel With |
|---|---|---|---|
| W1 Contracts and lead integration | Lead/planner | MOP-0 and merge control | Read-only reviewers |
| W2 Data/RPC/migrations | Data-integrity executor | Supabase, generated types, `actions.ts` | Test authors after RED contracts |
| W3 Right sidebar | Executor | component-library sidebar and modal handoff | Center/tree DB preflight after MOP-0 |
| W4 Center grid | Executor | `EstimateSheetContent.tsx`, row hooks/components | Right after MOP-0; tree only after MOP-4 |
| W5 Tree sidebar | Executor | `EstimateSheetTree.tsx`, tree state/query/reorder | Right after shared primitive plan |
| W6 Shared event/drag/read-only | Integration executor | parser/events/permission matrix | Area adapters |
| W7 UX/a11y/responsive | Designer/executor | shared UI primitives and semantics | After core data safety |
| W8 Tests/QA | Test engineer | RED->GREEN and release matrix | Throughout |
| W9 Security/data review | Security/data reviewer | RLS/grants/share headers/PII | After DB/client drafts |
| W10 Performance/observability | Perf/reliability | budgets, telemetry, rollout | After core behavior |
| W11 Docs/handoff | Writer | state updates, before/after report | After evidence |
| W12 Adversarial/final verification | Critic/verifier | plan and implementation claims | After draft/final packages |

## RACI by Shared File

| File / Surface | Writer | Required Reviewers | Merge Order | Conflict Rule |
|---|---|---|---|---|
| `supabase/migrations/*` and generated types | W2 data owner | W9 security/data, W8 tests | Before client wiring that consumes new API | No second migration author in same wave without lead approval. |
| `src/lib/estimates/actions.ts` | W2 data owner | W4 center, W5 tree, W9 security/data | Server contracts before UI adapters | Area owners request adapters; data owner writes shared action changes. |
| `src/components/workshop/EstimateSheetContent.tsx` | W4 center owner | W6 contracts, W8 tests | After MOP-2 server proof | Right/tree may not edit directly during center integrity pass. |
| `src/components/workshop/EstimateSheetTree.tsx` | W5 tree owner | W6 contracts, W7 UX/a11y, W8 tests | After MOP-3 server/authz proof | Shared event/keyboard changes require W6 signoff. |
| `src/components/workshop/component-library/index.tsx` | W3 right owner | W6 contracts, W8 tests | MOP-1 first, then MOP-4 adapters | Center/tree do not edit right reducer directly. |
| `src/components/ui/tree.tsx` | W7 primitive owner | W5 tree, W3 right, W8 tests | After primitive test plan exists | Any change requires regression tests for tree sidebar and right sidebar trees. |
| `src/components/workshop/ResizableSidePanel.tsx` | W7 UX/a11y owner | W3 right, W5 tree | MOP-0.5 only for id/copy; responsive behavior in MOP-5 | Side-specific owners do not fork panel behavior. |
| Telemetry helpers/tables | W10 observability owner | W2 data, W9 security/data | Sink proof before UI emitters rely on events | No raw/free-text fields; no duplicate event tables without decision record. |
| `src/proxy.ts` and share routes | W9 security owner | W5 tree, W8 tests | MOP-3 security pass | Token-bearing header policy is reviewed as one unit. |

## Migration Runbooks

Each migration wave must have a short runbook before SQL is written. Every new or changed RPC/function runbook must record `SECURITY INVOKER` versus `SECURITY DEFINER` choice, function owner, `SET search_path`, least-privilege `EXECUTE` grants, FORCE RLS/table-policy interaction where applicable, and role-based tests for anon, authenticated viewer, editor, and cross-workspace callers. App paths must not rely on service-role bypass for normal production mutations.

| Runbook | Affected Surfaces | Required Dump Scope | Gates | Irreversible / Stop Conditions | Strategy |
|---|---|---|---|---|---|
| Center atomic row move | `estimate_row_items`, `estimate_sheet_events`, new move RPC, generated types, `actions.ts` | affected estimate rows/events for test/prod target; full logical dump if production data touched | project ref, live signatures, RLS/grants, row revision conflict proof, history event proof | stop if expected revisions cannot be read deterministically or row locks deadlock | Prefer fix-forward after deploy; disable client handler by flag if RPC safe but UI bad. |
| Center bulk row delete | `estimate_row_items`, events/history, new bulk delete RPC, generated types, `actions.ts` | affected row items/events; full logical dump for production destructive rollout | one mismatched row commits nothing, viewer denied, cross-workspace denied | stop if partial delete cannot be prevented or recovery copy is ambiguous | Disable bulk delete UI; fix-forward RPC; restore from dump only if accepted. |
| Tree delete return | `delete_estimate_node_with_history`, `delete_estimate_nodes_bulk_with_history`, `estimate_nodes`, generated types | affected nodes/rows/events in deletion proof fixtures | authoritative deleted IDs, fallback node, grants/RLS | stop if cascade cannot be proven server-side | Fix-forward preferred; client can use guarded defer if owner accepts. |
| Tree sort-order numeric/sparse | `estimate_nodes.sort_order`, reorder/create RPCs, constraints/indexes, generated types, reorder code | full `estimate_nodes` logical dump plus related tabs/templates if write paths share constraints | live schema preflight, repeated-move exhaustion, generated types compile, numeric values preserved | stop if code truncates fractions or uniqueness constraints cannot be preserved | Separate PR; after fractional writes rollback is fix-forward unless dump restore is selected. |
| Telemetry storage | telemetry table/sink, grants/RLS/retention, emitters | telemetry table only if new; no app data dump needed | redaction allow-list, write/read grants, retention policy | stop if events require raw names/URLs/queries/free text | Disable telemetry claims or emitters; purge bad rows if emitted. |
