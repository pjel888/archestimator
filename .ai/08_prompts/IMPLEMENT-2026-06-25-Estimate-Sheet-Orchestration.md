# Implement Estimate Sheet Orchestration - Codebase AI Prompt

Paste this entire prompt into the codebase AI that will implement:

`/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`

This is an implementation prompt, not a planning prompt. The target package is already final-verified and implementation-ready. Your job is to implement it end to end, prove it with evidence, and stop only when the completion gates below are satisfied or a true blocker prevents safe progress.

## Mission

You are the lead codebase AI for the Estimate Sheet Master Orchestration implementation in the Archestimator repository at:

`/Users/philiplewis/Documents/archestimator`

Implement the final-verified orchestration package at:

`/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`

The business outcome is one coherent estimate workspace improvement program, not three isolated feature streams. The left project tree, center estimate grid, and right reusable-content dock must share the same persistence, event, permission, telemetry, responsive, and validation contracts.

Completion means:

- MOP-0 through MOP-5 are implemented and verified against the package.
- MOP-6 is executed only after behavior locks are green, or explicitly recorded as post-launch deferred where the package says it is deferred.
- Every `ESO-*` requirement in `02_CONSOLIDATED_REQUIREMENTS.md` is implemented, intentionally deferred, or rejected exactly as the package specifies.
- Every incorporated source ID in `14_SOURCE_ID_COVERAGE_APPENDIX.md` has implementation evidence.
- The final result passes targeted tests, type/lint/build checks proportional to changed scope, code review, architect review, and adversarial UltraQA.
- No provider, browser, production, or manual proof is claimed unless that proof was actually captured.

Do not stop after discovery, partial fixes, or a summary. Continue through implementation, verification, review, QA, and documentation updates.

## Authority And Repository Rules

Read these first:

1. `AGENTS.md`
2. The FAST PATH block at the top of `.ai/10_state/current-state.md`
3. `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/README.md`
4. All files in `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`

Pull deeper docs only when the touched scope needs them:

- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/10_state/decisions.md`
- `DESIGN.md`
- Relevant `.ai/06_specs/*`

If you touch Next.js APIs, routing, server actions, middleware/proxy behavior, or framework conventions, read the relevant guide in `node_modules/next/dist/docs/` before writing code. This repo uses Next.js 16, React 19, Bun, TypeScript, Tailwind v4, and Supabase/Postgres.

Hard constraints:

- Work inside the Archestimator project only.
- Supabase/Postgres mutations are authorized only for project ref `ebxxqidacheyapmmzavr`.
- Abort any database/provider operation that targets another project.
- PITR is intentionally disabled; before destructive or high-risk migration work, define and capture the manual logical dump scope.
- Do not deploy to production, alter unrelated provider projects, enable paid add-ons, push, or rewrite Git history unless the user explicitly asks for that separate action.
- Do not revert unrelated user or agent changes.
- Use existing project patterns before adding abstractions.
- Add no new dependency unless the package requires it and you record the decision.
- Browser automation, screenshots, Storybook, and visual QA are opt-in proof surfaces. Use them only for browser-only claims such as native drag/drop, focus trap, virtualization focus after scroll, or responsive drawer behavior.

## Required Workflow

Use the strict autonomous delivery loop:

`$deep-interview -> $ralplan -> $ultragoal (+ $ultrawork/$team if useful) -> $code-review -> $ultraqa`

The package is already final-verified. Therefore:

- Do not reopen broad planning unless live code or provider reality contradicts the package.
- If your runtime requires a deep-interview phase, record that requirements are already clarified by the final-verified package and continue.
- If your runtime requires a ralplan phase, treat the target package as the approved plan/test spec and confirm consensus evidence from `13_FINAL_READINESS_REVIEW.md` and `15_SCORECARD_AND_COMPLETION_AUDIT.md`.
- Use `$ultragoal` or equivalent durable goal execution for implementation.
- Use `$ultrawork` or native subagents for independent lanes when it improves throughput or review coverage.
- Use max 6 concurrent child agents.
- Keep the lead responsible for integration, sequencing, conflict resolution, and final evidence.
- Use maker/checker separation for non-trivial work: the verifier/reviewer must be distinct from the implementer when practical.

If the named workflows are unavailable, emulate them with the repository loop:

`DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE`

Persist state in the package folder and `.ai`, not only in chat.

## Durable Ledger And Evidence

Before editing application code, create or update an implementation ledger under:

`.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/implementation-ledger.md`

Also create an evidence folder such as:

`.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/evidence/implementation-<YYYYMMDDTHHMMSSZ>/`

Record:

- Current `git status --short`
- Current branch/worktree
- Target package path
- Phase state
- Owners for hot files
- Baseline validation commands and results
- Supabase project boundary proof
- Live schema/function/grant/RLS/constraint/index introspection summary before migrations
- Dump scope decisions
- RED tests/proofs added
- GREEN validation evidence
- Skipped checks with reason and residual risk
- Rollback/fix-forward evidence
- Review and UltraQA verdicts

Update these package docs after implementation evidence exists:

- `08_MASTER_BEFORE_AFTER_REPORT.md`
- `LOOP_LEDGER.md`
- `.ai/10_state/current-state.md` if project reality changes

Do not rewrite the three source plan folders. They are inputs.

## Required Package Files To Read

Read these completely before implementation:

- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/README.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/00_AGENT_COORDINATION.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/01_SOURCE_PLAN_INVENTORY.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/02_CONSOLIDATED_REQUIREMENTS.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/03_CONFLICTS_AND_RESOLUTIONS.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/04_CODEBASE_AND_DOCUMENTATION_AUDIT.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/06_AGENT_WORKSTREAMS_AND_PROMPTS.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/07_ORCHESTRATION_TODO.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/08_MASTER_BEFORE_AFTER_REPORT.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/09_TRACEABILITY_MATRIX.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/10_RISK_DECISION_AND_ROLLBACK_REGISTER.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/11_TEST_VALIDATION_AND_QA_STRATEGY.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/12_ADVERSARIAL_REVIEW.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/13_FINAL_READINESS_REVIEW.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/14_SOURCE_ID_COVERAGE_APPENDIX.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/15_SCORECARD_AND_COMPLETION_AUDIT.md`
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/LOOP_LEDGER.md`

## Current Code Anchors

Use targeted inspection and `rg` before edits. The package identifies these hot paths:

- Workspace shell: `src/components/workshop/EstimateWorkspaceClient.tsx`, `EstimateCenterColumnBoundary.tsx`, `ProjectMiniSidebar.tsx`, `ProjectWorkspaceHeaderRow.tsx`
- Center grid: `src/components/workshop/EstimateSheetContent.tsx`
- Center rows: `src/components/workshop/estimate-sheet/rows/cells.tsx`, `row-table.tsx`, `drop-zones.tsx`, `branch.tsx`, `activity-history.tsx`
- Row mutations: `src/hooks/use-estimate-row-mutations.ts`, `src/lib/domain/estimate-mutations.ts`, `src/lib/estimates/estimate-row-tree-patch.ts`
- Tree sidebar: `src/components/workshop/EstimateSheetTree.tsx`, `src/lib/estimates/estimate-tree-reorder.ts`, `src/hooks/use-estimate-workspace-state.ts`, `src/hooks/use-estimate-query.ts`
- Server actions: `src/lib/estimates/actions.ts`, `src/lib/reusable-sources/actions.ts`
- Right sidebar: `src/components/workshop/component-library/index.tsx`, `NewComponentForm.tsx`, `PreviewPanel.tsx`, `tree/LibraryTree.tsx`, `tree/TemplatesTree.tsx`, `tree/TemplatesTreeModel.ts`, `templates.ts`
- Component library manager: `src/components/workshop/component-library-manager/AddComponentModal.tsx`, `ComponentLibraryManager.tsx`
- Component library data: `src/lib/component-library/actions.ts`, `src/lib/component-library/library-telemetry.ts`
- Shared UI: `src/components/ui/tree.tsx`, `bulk-action-toolbar.tsx`, `toolbar-icon-button.tsx`, `toast.tsx`, `ResizableSidePanel.tsx`
- Share/proxy: `src/proxy.ts`, `src/app/share/[token]`, `src/app/api/share/[token]/*`
- Supabase: `supabase/migrations/*`, `src/lib/supabase/types.ts`

Confirmed source-level risk anchors to verify before changing:

- `EstimateSheetContent.tsx` applies a project-source returned tree directly through `setEstimateTree(() => result.tree)` in the non-optimistic path.
- `moveRowComponent` uses separate source and target replacements and calls `replaceRow` twice.
- `deleteSelectedRows` loops over `bulkSelectedRowIds` and calls single-row delete behavior.
- `getEstimateTreeContentSignature` includes row-item fields, so row-only edits can change tree signature.
- `createEstimateNode` derives `maxSiblingSortOrder + 1`.
- Current action code validates reorder sort orders as integers.
- `searchReusableProjectSources` needs latest-wins identity proof, not only a cancellation boolean.
- `ResizableSidePanel` sets responsive width to `0` below 1024px.
- Share referrer policy for token-bearing routes needs explicit review.
- `recordLibraryEvent` sanitizes event metadata, but telemetry storage/sink must be proven.

## Ownership And Conflict Rules

Use this RACI as binding unless MOP-0 records a safer override:

| File or surface | Writer | Required reviewers | Merge rule |
|---|---|---|---|
| `supabase/migrations/*`, `src/lib/supabase/types.ts` | Data owner | Security/data, tests | Data owner writes migrations and regenerated types before client consumers merge. |
| `src/lib/estimates/actions.ts` | Data owner | Center, tree, security/data | Area owners request adapters; data owner writes shared action changes. |
| `src/components/workshop/EstimateSheetContent.tsx` | Center owner | Contracts, tests | Right/tree agents do not edit during center integrity pass. |
| `src/components/workshop/EstimateSheetTree.tsx` | Tree owner | Contracts, UX/a11y, tests | Shared event/keyboard changes require contract owner signoff. |
| `src/components/workshop/component-library/index.tsx` | Right owner | Contracts, tests | MOP-1 first, then MOP-4 adapters. |
| `src/components/ui/tree.tsx` | Primitive owner | Tree, right, tests | Any change requires regressions for estimate tree and right-sidebar trees. |
| `src/components/workshop/ResizableSidePanel.tsx` | UX/a11y owner | Right, tree | MOP-0.5 only for id/copy; responsive behavior belongs to MOP-5. |
| Telemetry helpers/tables | Observability owner | Data, security/data | No raw/free-text fields and no duplicate event table without decision record. |
| `src/proxy.ts` and share routes | Security owner | Tree, tests | Token-bearing header policy reviewed as one unit. |

## Phase MOP-0: Common Control Plane And DB/Authz Preflight

Do this before feature code.

Required outputs:

- Implementation ledger created.
- Current `git status --short` recorded.
- Validation baseline recorded.
- Supabase project ref `ebxxqidacheyapmmzavr` proven.
- Live function signatures, grants, RLS policies, constraints, indexes, and generated types inspected before SQL.
- Manual logical dump scope recorded before destructive/high-risk migrations.
- RPC names and API shapes selected for center atomic row move and bulk row delete.
- Feature flags/rollback controls selected using existing project patterns.
- Telemetry storage/sink proven or created.
- Telemetry redaction allow-list documented and tested.
- Permission matrix finalized.
- Shared event contracts finalized.
- Snapshot-copy and success/recents semantics finalized.
- Owners assigned for hot files.
- RED tests/proofs named before implementation.

Binding permission defaults:

| State | Center grid | Tree | Right browse/search | Right create/edit/delete/duplicate | Drag/drop/custom/keyboard mutations |
|---|---|---|---|---|---|
| Editor | Enabled when target/source are fresh and writable. | Enabled after server edit authority proof. | Enabled. | Enabled only through server actions with workspace ownership checks. | Enabled only through guarded parsers and permission checks. |
| Viewer | Visible but disabled with reason for mutation. | Mutation disabled with reason. | Browse/search/preview allowed only when authorized. | Disabled or hidden with reason; server calls denied. | No-op with telemetry; server calls denied. |
| Public/share | Public read surface only. | No edit affordances; share-token policy applies. | Only public-safe previews if explicitly allowed. | Hidden; server calls denied. | No-op without leaking token/source details; server calls denied. |
| Stale/locked | Editing paused with reason and recovery path. | Mutations disabled until refresh/retry. | Browse/search may continue; insertion/edit disabled. | Disabled until lock clears. | No-op with stale/locked telemetry. |
| No estimate/invalid target | Empty/degraded state; no row mutation. | Navigation only when target valid. | Browse/search may remain; insertion disabled. | Disabled unless in global library manager context. | No-op with invalid-target telemetry. |

Telemetry must never log raw names, URLs, queries, filenames, file paths, supplier/component free text, or other PII.

## Phase MOP-0.5: Quick UI/A11y Preflight

Run only after MOP-0 ownership locks are complete.

Allowed scope:

- Tree empty CTA and visible empty states.
- Stable `aria-controls` and sidebar panel ids.
- Rename input height/token fixes with no data-flow impact.
- Isolated `useParams` route parsing cleanup.
- Scroll newly created node into view only if mutation semantics do not change.
- Right/sidebar hit-target or focus fixes with no persistence/API impact.
- Copy-only fixes that clarify desktop-first fallback or snapshot-copy language.

Do not:

- Edit `src/lib/estimates/actions.ts`.
- Add migrations or regenerate types.
- Touch persistence paths.
- Touch shared `src/components/ui/tree.tsx` keyboard/DnD behavior without MOP-4 ownership.
- Take over files owned by MOP-1 through MOP-3.

Exit criteria:

- Targeted DOM/static tests pass.
- No mutation semantics, schema, event contract, or server-action behavior changed.

## Phase MOP-1: Right Sidebar Persistence Honesty

Goal: make right-sidebar CRUD and project-source UI honest behind a flag while center/tree data-integrity work remains controlled.

Implement:

- Verify telemetry storage before wiring events.
- Characterize `AddComponentModal` edit/prefill identity semantics with tests.
- Route component archive/delete, restore, edit, and duplicate through persisted server paths.
- Enforce server-side edit authority and workspace ownership for every touched component-library server action.
- Use lifecycle archive, not hard delete.
- Remove local-only template group creation.
- Replace live/read-through language with snapshot-copy language.
- Add transition explainer copy.
- Add latest-wins request identity for project-source search.
- Enforce search abuse/privacy limits: workspace scoping, explicit viewer/public/share access decision, min/max query length, bounded page/result limits, debounce/cancel behavior, and no raw query telemetry.
- Rename Project tab to Project Components if still selected.
- Keep project-source insertion safety claims blocked until MOP-2 center revision-gate proof passes.

Use or select an equivalent feature flag:

`NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`

Exit criteria:

- Refresh proves persisted archive/delete/restore/edit/duplicate.
- Viewer/public/share/cross-workspace negative tests pass.
- RLS/grant proof passes for every touched write path.
- Search race, malformed input, oversized query, result limit, and no-raw-query telemetry tests pass.
- No local-only CRUD action looks persistent.

## Phase MOP-2: Center Integrity And Trust Gates

Goal: fix launch-blocking center data and trust paths.

Implement in this order:

1. Project-source revision gate before any parallel center/tree insert work can return a full tree.
2. Atomic center row component move.
3. All-or-nothing center bulk row delete, or remove the atomic UI claim.
4. Stale target/source freshness handling.
5. Read-only gating for row controls, drag sources, drops, keyboard picker, custom events, and sidebar callbacks.
6. Row-level save/failure chips and live-region announcements.
7. Destructive language fixes.
8. Virtualization active-editor pinning.

Atomic move must include:

- One persisted operation.
- Deterministic row-lock order.
- Expected source and target row revisions.
- Idempotent correlation id.
- `row_moved` history event.
- Row-count cap.
- Editor/viewer/cross-workspace checks.
- Generated Supabase types.

Bulk delete must include:

- All-or-nothing persistence.
- Mixed-revision failure writes zero rows.
- Truthful recovery UI.
- No `Promise.all` partial success.
- No per-row savepoint partial success.
- No compensating rollback substitute.

Exit criteria:

- SQL/RPC prove scripts pass.
- Generated types are current.
- Server-action tests pass.
- Center DOM race/failure tests pass.
- No stale full-tree overwrite under deferred response.
- No partial move or partial bulk persistence.
- Rollback/fix-forward instructions exist before client wiring merges.

## Phase MOP-3: Tree Security, Delete Authority, And DB Invariants

Implement:

- Explicit `assertCanEditEstimate` coverage for tree mutation server actions.
- Authoritative tree delete return shape from the server, or explicitly accepted guarded defer.
- Share/cache/referrer policy for token-bearing routes.
- Structure-only tree content signature with fields needed for navigation correctness: id/path, kind, name, parent, sort order/tab.
- Create/selection race fix.
- Pending prop queue fix.
- Rename failure recovery.
- Delete fallback selection.
- Expansion persistence.
- Max-depth guard of 100 at client/server/DB boundaries where touched.
- Tree sort-order scheme only after preflight proves risk.
- If numeric/sparse migration proceeds, code must accept and preserve numeric values before writes ship.

Exit criteria:

- Tree action/RPC/authz tests pass.
- Row-only center edits do not clobber tree state.
- Shared tree primitive regressions for right sidebar are covered before merge.
- Numeric/sparse sort rollback is fix-forward unless logical dump recovery is selected and tested.

## Phase MOP-4: Shared Interaction And Feedback Contracts

Implement:

- Shared guarded library drag payload reader.
- Window event detail validators.
- Malformed payload/custom event no-op with telemetry and no mutation.
- Permission matrix gates for all mutation entry points.
- Recents/success UI updates only after actual persistence/insert success.
- Project-source insert target semantics aligned between tree dispatch, right UI, and center consumer.
- Snapshot-copy copy locked.
- Keyboard equivalence model locked.
- Mutation feedback, cache reconciliation, and selection recovery aligned.

Shared events to cover:

- `archestimator:add-library-item`
- `INSERT_ESTIMATE_TEMPLATE_EVENT`
- `INSERT_PROJECT_SOURCE_EVENT`
- `CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT`

Exit criteria:

- Parser/event tests pass.
- Viewer/read-only/custom-event tests pass.
- Right and tree emitters conform to center consumers.

## Phase MOP-5: Accessibility, Responsive Fallback, Performance, And Observability

Implement:

- Grid dominance: right dock normal width stays near design range; wider states are temporary/resizable/overlay.
- Below-1024 fallback now.
- Drawer/sheet only if explicitly scoped with focus trap and browser proof.
- Table header scope/index/live region semantics.
- Tree keyboard support: F2 rename, Shift+F10/context, typeahead, Left/Right completeness, and explicit Move dialog from context/action menu.
- Center keyboard alternatives for replace/move: row action opens picker of valid targets/sources, Enter confirms, Escape cancels, invalid targets disabled with reason, outcomes match drag/drop persistence semantics.
- Focus restoration after create, rename, delete, modal close, insert, failed mutation, and virtualized row focus.
- Only one active bottom bulk dock visually dominant at a time.
- Payload/render-budget tests for tree reorder, right search, and center virtualized rows.
- Telemetry redaction proof.
- Dashboard/alert or daily review owner for beta observation.
- Rollback drill for flags and RPC/migration fix-forward path.
- Large-data local benchmarks.
- 48-hour observation window if user-facing change is released.

Below-1024 contract:

- `1023px`: center grid remains primary. Sidebars collapsed or link to desktop-sized controls. No silent loss of required actions. DOM/responsive proof for no overlap and visible fallback copy.
- `768px`: read-first center grid. Mutation controls that cannot fit are disabled with reason. Focus can enter and leave notice/grid. DOM proof required.
- `375px`: no dense editing claim. Show read-only estimate summary/grid preview and copy to use a wider screen for full editing. No off-screen required controls.

Selected keyboard model:

- Tree node move uses `Move...` dialog/picker, Enter confirms, Escape cancels and returns focus.
- Center replace uses row action or command palette picker, Enter confirms, Escape cancels and returns focus.
- Center move uses row action or command palette picker, valid targets only, same atomic move RPC as drag/drop.

A11y state/focus matrix:

- Row save pending: polite live region; focus stays in edited control.
- Row save success: polite live region; no focus-stealing toast.
- Row save failure: assertive live region; focus returns to failed field or retry.
- Stale conflict: assertive live region; focus moves to recovery control.
- Selection pruned/deleted: polite live region; focus moves to next valid row/node or heading.
- Row inserted: polite live region; focus moves to inserted row first editable field when allowed.
- Row deleted: polite live region; focus moves to next row, previous row, or empty-state action.
- Tree node renamed: polite live region; focus returns to renamed tree item.
- Virtualized row restored: polite only if user-visible; focus returns to active editor or row action.

Performance budgets:

- Tree drag hover validation average below 16ms at 1,000 flat nodes, below 50ms at 5,000 nodes, and below 50ms at 10,000 nodes.
- Estimate sheet load caps remain `maxNodeCount: 1500` and `maxRowItemCount: 5000`; truncation copy remains visible.
- Reusable source search caps remain 50 projects, 200 estimates per project, 300 node matches, 120 tab matches, 25 materialized estimates, 75 tabs per estimate, 600 tree nodes, and 1,200 row items per materialized tree.
- Template/project-source filtering stays below 1,000ms across five repeated runs for the 50-project synthetic case.
- Center 50-row and 500-row render baselines keep edited input focused and produce an interpretable render profile.

Exit criteria:

- DOM/a11y tests pass.
- Browser proof exists for claims source/DOM tests cannot prove.
- Performance budgets pass or an owner-recorded exception blocks beta/release.
- Rollback/fix-forward evidence exists.
- Telemetry can answer whether integrity fixes work for users.

## Phase MOP-6: Post-Launch Maintainability

Run only after behavior proof is green and MOP-0 through MOP-5 gates are complete.

Allowed work:

- Decompose `EstimateSheetContent.tsx` after tests lock behavior.
- Extract right-sidebar reducer/hooks after persistence honesty lands.
- Clean old terminology only in approved cleanup phase.
- Revisit account-synced preferences, mobile drawers, delete undo, lazy subtree loading, realtime collaboration, and product enhancements.

Do not rename DB/RPC/file keep-list names accidentally.

If MOP-6 is deferred, record it as a package-approved post-launch deferral. Do not treat deferred MOP-6 product enhancements as launch blockers unless the package explicitly makes them blockers.

## Database And RPC Runbook Requirements

For every new or changed RPC/function, record before SQL is written:

- `SECURITY INVOKER` versus `SECURITY DEFINER`
- Function owner
- `SET search_path`
- Least-privilege `EXECUTE` grants
- FORCE RLS/table-policy interaction
- Role tests for anon, authenticated viewer, editor, and cross-workspace callers

Migration runbooks required:

- Center atomic row move
- Center bulk row delete
- Tree delete return
- Tree numeric/sparse sort order if selected
- Telemetry storage

After Supabase changes:

- Regenerate types with `bun run gen:types`.
- Run focused SQL/RPC prove scripts or add them if missing.
- Verify server-action tests against generated types.
- Record rollback/fix-forward posture.

Do not apply SQL sketches from planning docs without live introspection.

## Required Starting Test Matrix

Add RED tests/proofs before each implementation slice. Existing tests that encode broken behavior must be inverted or replaced with focused contract tests.

Center starting commands:

```bash
bun x vitest run tests/vitest/estimate-sheet-row-details-crud.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-row-tree-patch.test.ts --maxWorkers=1
```

Add or update tests for:

- `estimate-sheet-move-component-atomicity`
- `estimate-sheet-bulk-delete-atomicity`
- `estimate-sheet-project-source-insert-race`
- `estimate-sheet-trust-gate-stale-target`
- `estimate-sheet-readonly-mode`
- Row save status/live-region
- Virtualized editor pinning

Tree starting commands:

```bash
bun x vitest run tests/vitest/estimate-tree-reorder.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/estimate-tree-edit.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/tree-external-drop.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/ui-tree.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/share-no-store-invariants.test.ts tests/vitest/shared-link-header-smoke-script.test.ts --maxWorkers=1
```

Add or update tests for:

- Permission gate/action tests
- Delete cascade/fallback tests
- Content signature tests
- Reorder payload/sort tests
- Create/prop-queue/rename failure tests
- Keyboard/tree navigation tests
- Share header/referrer policy tests

Right sidebar starting commands:

```bash
bun x vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/component-library-actions-revalidation.test.ts --maxWorkers=1
bun x vitest run tests/vitest/library-source-trust.test.ts --maxWorkers=1
bun x vitest run tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1
bun x vitest run tests/vitest/library-tab-a11y.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/library-template-insert-picker.test.tsx --maxWorkers=1
```

Add or update tests for:

- Archive/restore refresh
- Edit persistence
- Duplicate persistence
- Template group affordance removal
- Snapshot copy labels/toasts
- Project-source latest-wins search
- Viewer/public/share/cross-workspace negative cases
- Search min/max bounds, page/result caps, workspace scoping, debounce/cancel, and no raw query telemetry
- `AddComponentModal` edit identity characterization

Performance starting commands:

```bash
bun x vitest run tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1
bun x vitest run tests/vitest/templates-tree-performance.test.ts --maxWorkers=1
bun x vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1
```

Cross-surface tests to add or update:

- Shared drag payload parser
- Custom event validation/rejection
- Trust gate success/recents semantics
- Read-only keyboard/drag/custom event denials
- Telemetry redaction and event emission
- RPC security posture checks

## Final Verification Commands

Run targeted checks after each slice. At the final integration gate, run the smallest broad checks that can support your claim:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run lint:design
git diff --check
```

Run `bun run build` when touched code affects Next.js routes, server actions, middleware/proxy, generated types, or bundling.

Run `bun run validate` as a final/interpretable release signal after targeted tests. If it fails, classify every failure as pre-existing or newly introduced. Do not claim completion with an unclassified new failure.

Run browser/e2e only for browser-only claims:

- Native drag/drop behavior
- Keyboard DnD in a real browser
- Virtualized focus after scroll
- Drawer/focus trap responsive behavior
- Network throttling/offline behavior
- Screen-reader smoke with NVDA/Chrome or VoiceOver/Safari

Do not use browser proof as a substitute for SQL transaction proof, server-action authorization proof, or unit/DOM tests.

## Review And UltraQA Gates

Before final completion:

1. Run targeted verification.
2. Run cleanup/simplification review on changed files. If `$ai-slop-cleaner` is available, use it on changed files only.
3. Rerun the verification affected by cleanup.
4. Run independent code review with findings first. Final review must be `APPROVE` and architectural status must be `CLEAR`.
5. Run independent architect review on data/contract/shared-file boundaries. It must be clean or all findings must be resolved.
6. Run UltraQA adversarial review.

UltraQA must include at minimum:

- Editor success paths for center, tree, and right sidebar.
- Viewer denial paths.
- Public/share denial and no token leakage paths.
- Cross-workspace denial paths.
- Stale/locked/no-estimate paths.
- Malformed drag/custom event paths.
- Search abuse/privacy paths.
- Atomic move failure injection.
- Bulk delete mixed-revision failure injection.
- Project-source deferred response preserving newer local edits.
- Row-only edit not clobbering tree state.
- Refresh honesty for right CRUD.
- Below-1024 fallback checks.
- Keyboard picker/dialog alternatives.
- A11y live-region/focus outcomes.
- Performance budgets.
- Telemetry redaction.
- Rollback/fix-forward drill.

If code review or UltraQA is not clean, return to planning for the finding, revise implementation, and rerun verification. Do not patch findings ad hoc without recording the loop.

## Unsafe Shortcuts To Reject

Reject these even if they seem faster:

- Shipping UI fixes before server atomicity proof for data-integrity issues.
- Applying migration-plan SQL sketches without live introspection.
- Keeping two-RPC center move with compensating rollback.
- Implementing bulk row delete as `Promise.all` or partial-success savepoints.
- Depending on RLS alone while UI/actions permit viewer mutation attempts.
- Treating Playwright drag/drop success as proof of transaction atomicity.
- Adding a new feature-flag framework when existing patterns suffice.
- Creating a template-group persistence table for this scope.
- Renaming DB/RPC/file `sheet` keep-list names during terminology cleanup.
- Logging raw telemetry queries, names, URLs, file paths, filenames, suppliers, components, or free text.
- Claiming right project-source insertion safety before MOP-2 center revision-gate proof.
- Claiming full mobile editing below 1024px without scoped drawer/focus-trap/browser proof.
- Claiming provider, browser, production, or manual proof from local-only checks.

## Traceability Requirement

Maintain a live traceability table in the implementation ledger with these columns:

| Requirement | Source IDs | Phase | Files changed | Tests/proof | Result | Gaps |
|---|---|---|---|---|---|---|

Every row from `09_TRACEABILITY_MATRIX.md` must be represented. Every incorporated source ID from `14_SOURCE_ID_COVERAGE_APPENDIX.md` must be covered by one row or by an explicitly referenced grouped row.

Completion is invalid if any incorporated requirement has no proof or an unclassified gap.

## Expected Final Report

At completion, provide a concise but evidence-backed report with:

- Current mode and final status.
- Phases completed.
- Files changed by category: DB/migrations/types, server actions, center, tree, right, shared contracts, UX/a11y, tests, docs.
- Requirement coverage summary for all `ESO-*` IDs.
- Source-ID coverage summary for center, right, tree, and edge-case ranges.
- Supabase project boundary evidence.
- Migration/runbook evidence.
- Test commands and results.
- Type/lint/build/validate results.
- Browser/manual/provider proof boundaries.
- Rollback/fix-forward evidence.
- Code-review verdict.
- Architect-review verdict.
- UltraQA verdict.
- Remaining risks.
- Release decision: `GO`, `WATCH`, or `NO-GO`.

Use this final claim wording only after evidence exists:

```text
The estimate workspace implementation completed phases MOP-0 through MOP-5, with MOP-6 either completed after behavior locks or recorded as package-approved post-launch deferral.
Verified evidence:
- Data/RPC:
- Center:
- Tree:
- Right sidebar:
- UX/a11y:
- Performance/ops:
- Broad validation:

Known gaps:
-

Release decision:
- GO / WATCH / NO-GO
```

## Stop Conditions

Stop only when one of these is true:

- All required implementation, verification, review, and UltraQA gates pass.
- A destructive, irreversible, external-production, or credential-gated action is required and cannot be safely completed under existing standing authorization.
- A live provider/project boundary check indicates the operation would target a project other than `ebxxqidacheyapmmzavr`.
- The same blocker recurs across three recorded loops and no meaningful recovery path remains.
- The user explicitly says stop, cancel, or abort.

Anything else is recoverable implementation work. Continue.
