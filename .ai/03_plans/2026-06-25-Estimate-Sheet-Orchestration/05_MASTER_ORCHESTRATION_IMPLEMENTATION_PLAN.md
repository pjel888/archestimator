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
- Define permission matrix for editor/viewer/public/share states across center, tree, right, drag, keyboard, and custom events.
- Define shared event contracts for `archestimator:add-library-item`, `INSERT_ESTIMATE_TEMPLATE_EVENT`, `INSERT_PROJECT_SOURCE_EVENT`, and `CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT`.
- Define snapshot-copy copy and success/recents semantics.
- Assign single owners for migrations, `src/lib/estimates/actions.ts`, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `component-library/index.tsx`, `ui/tree.tsx`, `src/proxy.ts`, and telemetry.

Exit criteria:

- Contract doc checked in and telemetry sink/table decision recorded.
- Project boundary and live schema/RLS/grant baseline recorded.
- Future branch has no ambiguous shared-file owner.
- Targeted RED tests/proofs are named before implementation starts.

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
- Use lifecycle archive, not hard delete.
- Remove local-only template group creation.
- Replace live/read-through language with snapshot-copy language and transition explainer.
- Add latest-wins request identity for project-source search.
- Rename Project tab to Project Components if still selected.
- Keep project-source insertion safety claims blocked on MOP-2 center revision-gate proof.

Exit criteria:

- Right-sidebar honesty tasks are behind `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` or selected equivalent.
- Refresh proves persisted archive/delete/restore/edit/duplicate.
- Search race test passes.
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
- Add tree keyboard support: F2 rename, Shift+F10/context, typeahead, Left/Right completeness, and chosen keyboard move model.
- Add command-palette-style keyboard alternative for center replace/move if selected.
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

Each migration wave must have a short runbook before SQL is written.

| Runbook | Affected Surfaces | Required Dump Scope | Gates | Irreversible / Stop Conditions | Strategy |
|---|---|---|---|---|---|
| Center atomic row move | `estimate_row_items`, `estimate_sheet_events`, new move RPC, generated types, `actions.ts` | affected estimate rows/events for test/prod target; full logical dump if production data touched | project ref, live signatures, RLS/grants, row revision conflict proof, history event proof | stop if expected revisions cannot be read deterministically or row locks deadlock | Prefer fix-forward after deploy; disable client handler by flag if RPC safe but UI bad. |
| Center bulk row delete | `estimate_row_items`, events/history, new bulk delete RPC, generated types, `actions.ts` | affected row items/events; full logical dump for production destructive rollout | one mismatched row commits nothing, viewer denied, cross-workspace denied | stop if partial delete cannot be prevented or recovery copy is ambiguous | Disable bulk delete UI; fix-forward RPC; restore from dump only if accepted. |
| Tree delete return | `delete_estimate_node_with_history`, `delete_estimate_nodes_bulk_with_history`, `estimate_nodes`, generated types | affected nodes/rows/events in deletion proof fixtures | authoritative deleted IDs, fallback node, grants/RLS | stop if cascade cannot be proven server-side | Fix-forward preferred; client can use guarded defer if owner accepts. |
| Tree sort-order numeric/sparse | `estimate_nodes.sort_order`, reorder/create RPCs, constraints/indexes, generated types, reorder code | full `estimate_nodes` logical dump plus related tabs/templates if write paths share constraints | live schema preflight, repeated-move exhaustion, generated types compile, numeric values preserved | stop if code truncates fractions or uniqueness constraints cannot be preserved | Separate PR; after fractional writes rollback is fix-forward unless dump restore is selected. |
| Telemetry storage | telemetry table/sink, grants/RLS/retention, emitters | telemetry table only if new; no app data dump needed | redaction allow-list, write/read grants, retention policy | stop if events require raw names/URLs/queries/free text | Disable telemetry claims or emitters; purge bad rows if emitted. |
