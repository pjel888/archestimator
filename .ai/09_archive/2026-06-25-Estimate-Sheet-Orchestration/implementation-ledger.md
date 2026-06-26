---
title: Estimate Sheet Orchestration Implementation Ledger
type: docs
date: 2026-06-25
status: active
---

# Estimate Sheet Orchestration Implementation Ledger

## Master Execution Goal

Implement the final-verified estimate-sheet orchestration package end to end for
the Archestimator repo. The intended outcome is one coherent estimate workspace
where the left project tree, center estimate grid, and right reusable-content
dock share the same persistence, event, permission, telemetry, responsive,
rollback, and validation contracts.

Scope:

- Execute MOP-0 through MOP-5 from
  `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`.
- Treat MOP-6 as package-approved post-launch work unless MOP-0 through MOP-5
  behavior locks are already green and the refactor is safe.
- 2026-06-25 continuation: the owner explicitly authorized non-rejected MOP-6
  and previously deferred work; extension slices are tracked below without
  reclassifying rejected items.
- Preserve the three source plan folders as inputs only.
- Keep work inside Archestimator and Supabase project `ebxxqidacheyapmmzavr`.

Non-goals:

- No production deploy.
- No paid add-ons or PITR enablement.
- No provider writes outside linked Archestimator project
  `ebxxqidacheyapmmzavr`.
- No destructive data-loss operation without recorded dump/recovery scope.
- No broad terminology/database/file renames outside this package.
- No edits to unrelated current work such as `src/components/landing-v3`.

Acceptance gates:

- Every `ESO-*` requirement is implemented, package-deferred, or rejected with
  evidence matching `02_CONSOLIDATED_REQUIREMENTS.md`.
- Every incorporated source ID in `14_SOURCE_ID_COVERAGE_APPENDIX.md` maps to
  implementation or verification evidence.
- MOP-0 contracts are recorded before feature code.
- Each implementation slice starts with RED tests/proofs and ends with targeted
  GREEN evidence.
- Type/lint/build/broad validation are run proportionally and every failure is
  classified.
- Independent code review, architect review, and UltraQA are clean or the loop
  returns to implementation.

Final deliverables:

- Code, migration/type, test, and doc changes needed for MOP-0 through MOP-5.
- Updated `08_MASTER_BEFORE_AFTER_REPORT.md`, `LOOP_LEDGER.md`, this ledger,
  and `.ai/10_state/current-state.md` if project reality changes.
- Evidence folder entries under `evidence/implementation-20260625T095050Z/`.
- Final release decision `GO`, `WATCH`, or `NO-GO`.

## Full-Scope Continuation Checkpoint

Timestamp: 2026-06-25T13:44:09Z provider readback; local verification completed
in the same continuation pass.

Answer to the source-folder question:

- The three 2026-06-24 source-analysis folders were **not** fully implemented at
  the start of this audit.
- The safe, non-rejected continuation gaps handled in this pass are now
  implemented and verified: account-backed right-sidebar preferences,
  account-backed estimate-sheet column widths, editable-total cost sort,
  destructive delete recovery copy, right-sidebar hover prefetch dedupe,
  context-menu rename focus restoration, sparse create-sort step, durable
  telemetry provider proof, `estimate_sheet_event_result` execute hardening,
  tree `F-23` route-param parsing, product-specific compact `Sources` drawer
  source/jsdom proof, right-sidebar reducer/hook extraction, numeric
  `estimate_nodes.sort_order`, tree F-24/F-25/F-26 non-launch polish, local
  component-image fallbacks, same-scope activity-history filter debounce, toast
  bottom-dock clearance, proposal preview unsaved-edits warning, and center
  row-delete post-success Undo, pure center helper/model extraction for M-21
  through M-24, M-21/M-22/M-23/M-24 center controller hook extractions, and
  tree/subtree post-success delete Undo, lazy subtree hydration, and a concrete
  realtime-v2 tree collaboration contract.
- No still-unimplemented row remains for the three June 24 estimate-sheet source
  folders under this orchestration scope. Remaining risks are outside this local
  source-folder implementation claim: unrelated migration-list drift and any
  future production/manual/browser-matrix proof not requested for this slice.

Provider evidence:

- Linked project confirmed as `ebxxqidacheyapmmzavr` / Archestimator via
  `supabase/.temp/project-ref`, `supabase/.temp/linked-project.json`, and
  Supabase MCP project listing.
- Scoped SQL was applied to the linked project for local migration versions
  `20260625183000`, `20260625193000`, `20260625203000`, `20260625213000`,
  `20260625214500`, `20260625220000`, `20260625221500`, `20260626013000`,
  and `20260626023000`.
- `supabase migration repair --linked --status applied ...` succeeded for all
  nine target versions.
- Provider readback showed `component_library_telemetry_events`,
  `component_library_user_preferences`, and `estimate_sheet_user_preferences`
  all exist, have RLS enabled, deny direct anon/authenticated table access, and
  retain the `deny direct api access` policy.
- Provider readback showed `estimate_sheet_event_result(uuid, uuid)` exists,
  `anon` execute is false, and authenticated/service-role execute are true.
- Provider readback showed `estimate_nodes.sort_order` as `numeric(20,4)`,
  preserved tab-aware constraints/indexes, no duplicate sibling sort slots, no
  integer create-node overload, and a numeric create-node overload.
- Provider readback showed `restore_deleted_estimate_rows_with_history` exists,
  is `SECURITY DEFINER`, denies anon execute, allows authenticated execute, and
  has aligned local/remote migration history for `20260626013000`.
- Provider readback showed `restore_deleted_estimate_nodes_with_history` exists,
  is `SECURITY DEFINER`, denies anon execute, allows authenticated execute, and
  has aligned local/remote migration history for `20260626023000`.

Local verification:

- `bun x vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts
  --maxWorkers=1` passed, 1 file / 12 tests.
- `bun x vitest run tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx
  tests/vitest/component-library-ui.test.tsx
  tests/vitest/estimate-node-reorder-action.test.ts
  tests/vitest/estimate-tree-reorder.test.ts --maxWorkers=1` passed, 4 files /
  140 tests.
- `bun x vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx
  tests/vitest/estimate-sheet-user-preferences.test.ts
  tests/vitest/component-library-user-preferences.test.ts
  tests/vitest/component-library-durable-telemetry.test.ts --maxWorkers=1`
  passed, 4 files / 52 tests.
- `bun x vitest run tests/vitest/estimate-tree-reorder.test.ts
  tests/vitest/estimate-node-reorder-action.test.ts
  tests/vitest/workspace-repository-estimate-tree.test.ts
  tests/vitest/estimate-node-sort-order-migration.test.ts
  tests/vitest/estimate-sheet-tree-dnd.test.tsx
  tests/vitest/estimate-sheet-tree-dom.test.tsx
  tests/vitest/estimate-template-drop-zones.test.tsx
  tests/vitest/ai-package-builder-apply.test.ts --maxWorkers=1` passed,
  8 files / 104 tests.
- `bun x vitest run tests/vitest/estimate-tree-context-menu.test.tsx
  tests/vitest/estimate-tree-modal.test.tsx
  tests/vitest/estimate-sheet-tree-dnd.test.tsx --maxWorkers=1` passed,
  3 files / 53 tests.
- `bunx vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts
  tests/vitest/estimate-sheet-version-control-actions.test.ts
  tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx
  --maxWorkers=1` passed, 3 files / 49 tests.
- `bunx vitest run tests/vitest/estimate-tree-context-menu.test.tsx
  tests/vitest/estimate-tree-bulk-selection.test.tsx
  tests/vitest/estimate-node-reorder-action.test.ts
  tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1`
  passed, 4 files / 82 tests.
- `bun run type-check` passed.
- `git diff --check` passed.

Residual risk:

- `supabase migration list --linked` still shows unrelated historical local-only
  and remote-only migration rows outside this estimate-sheet continuation slice;
  the target versions above are aligned.
- Browser proof remains limited by claim: most changed claims are covered by
  source, DOM/unit, TypeScript, and provider metadata evidence. The compact
  right `Sources` drawer browser proof later passed in local Chromium at 1023px
  and 390px, but no production/manual/browser-matrix claim is made.

## MOP-0 Intake Snapshot

Timestamp: `20260625T095050Z`.

Branch/worktree:

- Branch: `codex/estimate-sheet-orchestration`.
- Worktree type: normal checkout (`git rev-parse --git-dir` and
  `--git-common-dir` both returned `.git`).
- HEAD: `1a9acf48f92f5dff693e05488e780ba5fe9a83e0`.

Git status before implementation-ledger writes:

```text
## codex/estimate-sheet-orchestration
 M src/components/landing-v3/landing-v3.module.css
```

Concurrent/unfamiliar work preserved:

- `src/components/landing-v3/landing-v3.module.css` changed outside the
  estimate-sheet scope. Diff shows public landing max widths changing from
  `1728px` to `2048px` with a comment. This ledger records it as unrelated
  current work; do not overwrite, format, or revert it.

Package intake completed:

- Read `AGENTS.md`.
- Read `.ai/10_state/current-state.md` FAST PATH block and targeted
  estimate-sheet/current-state snippets.
- Read pasted directive
  `/Users/philiplewis/.codex/attachments/08dd27fa-746f-4385-bb19-197abafffbf7/pasted-text-1.txt`.
- Read implementation prompt
  `.ai/08_prompts/IMPLEMENT-2026-06-25-Estimate-Sheet-Orchestration.md`.
- Read master plan
  `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`.
- Read execution prompt
  `.ai/08_prompts/000_Planning Prompts/Executing-Plan-Prompt.md`.
- Read all package files in
  `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/`.
- Read `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` for loop and database
  mandate.

Skill/workflow handling:

- Loaded requested workflow skills: `ultragoal`, `ultrawork`, `ultraqa`,
  `autopilot`, and `ralph`.
- Loaded relevant Superpowers skills: `using-superpowers`,
  `executing-plans`, `subagent-driven-development`,
  `using-git-worktrees`, and `verification-before-completion`.
- Loaded relevant Compound Engineering execution skill: `ce-work`.
- No exact installed top-level skill named `$compound-engineering`; using the
  plugin's `ce-work` surface for implementation-plan execution.

## MOP-0 Coordination Ledger

| Lane | Owner role | Scope | Dependencies | Current status |
|---|---|---|---|---|
| Lead coordinator | Main agent | Goal, ledger, contracts, sequencing, integration, final evidence | All lanes | Active |
| Data/Supabase preflight | `ce-data-integrity-guardian` subagent + lead hosted query | Project boundary, migrations/RPCs/types, telemetry sink, SQL runbooks | MOP-0 docs | Complete read-only; remote/local drift recorded |
| Center current-state map | `explore` subagent | Center move, bulk delete, project-source stale response, row mutation anchors | MOP-2 docs | Complete read-only |
| Right current-state map | `explore` subagent | Right CRUD honesty, project-source search, modal identity, telemetry | MOP-1 docs | Complete read-only |
| Tree/share current-state map | `explore` subagent plus lead recovery | Tree signature/authz/delete/sort/share headers | MOP-3 docs | Subagent errored on context limit; lead recovered narrow local facts |
| Validation planner | `test-engineer` subagent | Baseline commands, RED/GREEN order, known reds/hangs | MOP-0 through MOP-5 docs | Complete read-only |
| UX/a11y contract map | `designer` subagent | MOP-0.5 quick wins, below-1024, keyboard/focus/live regions | MOP-5 docs, `DESIGN.md` as needed | Complete read-only |

Subagent write authority: none. All initial lanes were read-only; completed
agents were closed after reporting.

## MOP-0 Current Facts

Supabase boundary evidence:

- `supabase/.temp/project-ref` contains `ebxxqidacheyapmmzavr`.
- `supabase/.temp/linked-project.json` reports ref `ebxxqidacheyapmmzavr`,
  name `Archestimator`.
- `package.json` `gen:types` script targets
  `supabase gen types typescript --project-id ebxxqidacheyapmmzavr`.

Initial feature-flag pattern evidence:

- Existing env-backed flags are plain env reads with narrow helper modules,
  for example `src/lib/estimates/express-components.ts`,
  `src/lib/collaboration/feature-flags.ts`,
  `src/lib/workshop/virtualization-flags.ts`, and `.env.example`.
- MOP-1 candidate flag remains
  `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` unless MOP-0 proves a narrower
  existing pattern should be reused.
- Rollback warning: `NEXT_PUBLIC_*` values are build-time/public-client flags;
  do not claim no-redeploy rollback unless a runtime flag path is selected.

Initial telemetry evidence:

- `src/lib/component-library/library-telemetry.ts` exposes
  `recordLibraryEvent`.
- `tests/vitest/library-telemetry-emit.test.ts` covers metadata sanitization
  and share-route boundaries.
- Initial `library-telemetry.ts` evidence showed only an in-process sanitized
  sink with `setLibraryTelemetrySink`; MOP-6 durable telemetry continuation now
  adds `public.component_library_telemetry_events`, a server-action sink, and
  hosted provider proof.
- Durable `public.estimate_sheet_events` remains the estimate history/audit
  event stream. Generic component-library/right-sidebar rollout telemetry now
  has its own locked-down durable sink.

Initial confirmed code-risk anchors:

- `EstimateSheetContent.tsx` has project-source code that can set the returned
  full tree directly at `setEstimateTree(() => result.tree)`.
- `EstimateSheetContent.tsx` still contains `moveRowComponent` that prepares
  target/source replacements and calls `replaceRow` twice.
- `EstimateSheetContent.tsx` still contains `deleteSelectedRows` looping over
  `bulkSelectedRowIds` and calling the single-row delete path.
- `EstimateSheetTree.tsx` uses `getEstimateTreeContentSignature`; the current
  helper location is `src/lib/estimates/estimate-tree-reorder.ts`.
- `createEstimateNode` currently derives `maxSiblingSortOrder + 1` in
  `src/lib/estimates/actions.ts`.

Integrated read-only lane findings:

- Data/Supabase: hosted project-ref evidence consistently points at
  `ebxxqidacheyapmmzavr`; local `supabase/config.toml` `project_id =
  "archestimator"` is a local CLI project name and not hosted project proof.
- Data/Supabase: generated types contain existing row-history RPCs
  `insert_estimate_row_item_with_history`,
  `update_estimate_row_item_with_history`,
  `replace_estimate_row_item_with_history`, and
  `delete_estimate_row_item_with_history`; no generated center atomic move RPC
  or center all-or-nothing bulk row delete RPC exists yet.
- Data/Supabase: generated types contain tree RPCs
  `reorder_estimate_nodes_with_history`,
  `delete_estimate_node_with_history`,
  `delete_estimate_nodes_bulk_with_history`, and
  `insert_estimate_subtree_into_estimate_with_history`.
- Hosted data/Supabase: initial linked remote function introspection did not
  return `move_estimate_row_component_with_history`,
  `delete_estimate_row_items_bulk_with_history`, or
  `delete_estimate_nodes_bulk_with_history`. MOP-6 provider continuation
  applied the two scoped SQL files directly and post-apply proof now shows
  those RPCs exist with authenticated grants, anon denied, edit assertions, and
  idempotency lookup. Migration-history rows remain drifted because broad
  `supabase db push` was intentionally avoided.
- Hosted data/Supabase: `supabase migration list --linked` shows drift in both
  directions, including local-only migration versions and remote-only versions
  `20260621105407` and `20260621112542`.
- Hosted data/Supabase: RLS is enabled on `estimates`, `estimate_tabs`,
  `estimate_nodes`, `estimate_row_items`, and `estimate_sheet_events`; FORCE
  RLS is false on all five. `anon` has table-level SELECT grants on
  `estimates`, `estimate_nodes`, and `estimate_row_items`, but the returned
  policies for the target tables are `{authenticated}`-scoped.
- Center: current `moveRowComponent` is non-atomic because it calls
  `replaceRow` for target and source separately; current bulk selected row
  delete loops single-row deletes; current project-source insert can apply a
  full returned tree directly.
- Right: create via `AddComponentModal` is action-backed, but duplicate
  identity is advisory client-side (`name + category + (supplier OR brand)`)
  and can be bypassed. Search is debounced with a local cancel flag, not a
  request-token or abort-backed latest-wins guarantee.
- Right: template copy paths carry `source_library_item_id` and
  `source_snapshot`; snapshot copy semantics need a regression lock rather
  than a new design.
- Tree/share recovery: `EstimateSheetTree.tsx` reconciles incoming props using
  `getEstimateTreeContentSignature`, and that helper includes row item content.
  This means row-only edits can still look like tree content changes unless
  MOP-3 switches the relevant reconciliation to structure-only semantics.
- Tree/share recovery: single and bulk tree delete actions call history RPCs
  and return refreshed server trees, but they still compute deleted IDs and
  fallback selection client/action-side before/around the RPC.
- Tree/share recovery: `createEstimateNode` still computes sort with
  `maxSiblingSortOrder + 1`; reorder action validates non-negative integer
  sort orders and delegates cycle enforcement to the DB RPC.
- Tree/share recovery: `src/proxy.ts` applies sensitive no-store cache control
  to `/share`, and existing tests cover share no-store plus share header smoke
  paths. Referrer-policy coverage appears in Next config/header tests, not the
  proxy itself.
- UX/a11y: MOP-0.5 safe wins are tree empty-state copy/CTA, side-panel stable
  IDs plus `aria-controls`, and copy-only below-1024 fallback notice. Mutation
  authority, drag/drop, shared tree primitive keyboard behavior, server
  actions, migrations, and persistence remain deferred to later MOPs.
- UX/a11y: `canEditEstimate` reaches center content but not tree or right
  sidebar props; tree mutation paths, center custom insert events, and command
  paths need explicit read-only contract tests.

## MOP-0 Contract Draft

Hot-file ownership:

| Surface | Writer | Required reviewers | Merge rule |
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

Permission matrix:

- Adopt the binding defaults from
  `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md` MOP-0 unless a narrower
  implementation decision is recorded here with evidence.
- Editor can mutate only with fresh writable target/source and server edit
  authority.
- Viewer/public/share/stale/locked/no-estimate states must block mutation
  through UI, drag/drop, keyboard, callbacks, and custom events; server actions
  remain the authority.

RPC/API names selected for RED tests and SQL design:

- Atomic center move:
  `move_estimate_row_component_with_history(target_project_id uuid,
  target_estimate_id uuid, source_row_id uuid, target_row_id uuid,
  expected_source_row_revision integer, expected_target_row_revision integer,
  source_replacement_payload jsonb, target_replacement_payload jsonb,
  acting_user_id uuid default null, correlation_id uuid default
  gen_random_uuid()) returns jsonb`.
- All-or-nothing selected-row delete:
  `delete_estimate_row_items_bulk_with_history(target_project_id uuid,
  target_estimate_id uuid, target_row_ids uuid[], expected_row_revisions jsonb,
  acting_user_id uuid default null, correlation_id uuid default
  gen_random_uuid()) returns jsonb`.
- Both require explicit expected revision inputs, deterministic row lock order,
  idempotency via `estimate_sheet_event_result`, bounded row-count caps,
  authenticated-only EXECUTE grants, and role tests.

Telemetry redaction allow-list draft:

- Allowed: event name, workspace/project/estimate/row/node ids, role/state enum,
  result enum, reason code enum, count/size/duration numbers, feature flag
  state, correlation id, and bounded error category.
- Forbidden: raw names, URLs, queries, filenames, file paths, supplier text,
  component/material/free-text fields, prompt/provider text, share tokens, and
  unbounded metadata objects.

Validation baseline:

- Targeted baseline passed before feature-code implementation:
  `git status --short`, `bun run type-check`,
  `bun x vitest run tests/vitest/library-source-trust.test.ts
  tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1`,
  `bun x vitest run tests/vitest/estimate-sheet-actions-authz.test.ts
  tests/vitest/estimate-row-tree-patch.test.ts --maxWorkers=1`,
  `bun x vitest run tests/vitest/estimate-tree-reorder.test.ts
  tests/vitest/share-no-store-invariants.test.ts
  tests/vitest/shared-link-header-smoke-script.test.ts --maxWorkers=1`, and
  `bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts
  tests/vitest/templates-tree-performance.test.ts --maxWorkers=1`.
- Results: type-check passed; focused Vitest groups passed 2 files / 10 tests,
  2 files / 15 tests, 3 files / 32 tests, and 2 files / 10 tests.
- All focused Vitest runs emitted the same Node `module.register()`
  deprecation warning; no tests failed on that warning.
- Full `bun run validate` is intentionally not the MOP-0 baseline because FAST
  PATH records known pre-existing `validate` red/noisy behavior and possible
  all-DOM hang.

Manual dump scope:

- Pending live schema/RPC preflight and only required before destructive or
  high-risk hosted SQL. Scope: affected `estimate_row_items`,
  `estimate_nodes`, `estimate_sheet_events`, `estimate_tabs`, and any new
  telemetry table if created. PITR remains disabled by project policy.

Hosted provider preflight:

- Completed `supabase migration list --linked` against
  `ebxxqidacheyapmmzavr`.
- Completed SELECT-only introspection over `pg_proc`, `pg_class`, `pg_policy`,
  `pg_indexes`, `information_schema.table_constraints`,
  `supabase_migrations.schema_migrations`, and
  `has_function_privilege`/`has_table_privilege` for `anon`,
  `authenticated`, and `service_role`.
- No DDL, DML, provider setting changes, dumps, or production deploys were
  performed.

## Live Traceability Table

| Requirement | Source IDs | Phase | Files changed | Tests/proof | Result | Gaps |
|---|---|---|---|---|---|---|
| `ESO-PREREQ-01` | Center `M-0/M-0T/M-0R`, right `Task 1.0`, tree `P0.5` | MOP-0/MOP-6 | This ledger; `evidence/implementation-20260625T095050Z/mop0-preflight.md`; `mop0-readonly-introspection.sql`; `mop6-durable-telemetry.md` | Branch, package intake, project-ref proof, subagent findings, lead tree/share recovery, local baseline, hosted read-only introspection, durable telemetry provider proof | Pass for implementation start and telemetry sink | Migration-history drift remains unresolved; dump scope still required before destructive/high-risk SQL |
| `ESO-QUICK-01` | Tree `P0`, right low-risk focus/hit-target findings | MOP-0.5 | `src/components/workshop/ResizableSidePanel.tsx`; `src/components/workshop/EstimateSheetTree.tsx`; `src/components/workshop/EstimateWorkspaceClient.tsx`; focused tests | RED-to-GREEN MOP-0.5 DOM/a11y tests; adjacent side-panel governance tests; type-check; `git diff --check` | Pass | Copy-only fallback; true responsive behavior remains MOP-5 |
| `ESO-DATA-01` | `ESC-P0-01`, center `M-1` | MOP-2/MOP-6 | `supabase/migrations/20260625183000_estimate_center_atomic_row_mutations.sql`; `src/lib/supabase/types.ts`; `src/lib/estimates/actions.ts`; `src/hooks/use-estimate-row-mutations.ts`; `src/components/workshop/EstimateSheetContent.tsx`; focused tests | RED-to-GREEN schema/action/source contract tests; focused MOP-2 suite; type-check; `git diff --check`; MOP-6 linked provider function-catalog proof | Pass locally and linked RPCs applied | Migration-history drift remains unresolved; version row not recorded by direct scoped SQL apply |
| `ESO-DATA-02` | `ESC-P1-03`, center `M-3` | MOP-2 | Same MOP-2 migration/action/hook/component paths; `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx` | DOM test proves failed bulk delete restores every selected row and success removes all only after one bulk action; action/schema tests prove one RPC | Pass locally | Hosted migration drift remains unresolved; browser proof skipped because jsdom covers the interaction claim |
| `ESO-DATA-03` | `ESC-P0-02`, right `F-11`, tree external source events | MOP-1/MOP-2/MOP-4 | `src/components/workshop/EstimateSheetContent.tsx`; `src/components/workshop/component-library/templates.ts`; `tests/vitest/estimate-sheet-center-atomic-contracts.test.ts`; MOP-4 parser/matrix tests | MOP-2 source contract proves project-source full-tree response is gated by `getEstimateTreeRevision`; MOP-4 validators prove project-source event detail shape is shared and malformed details no-op | Pass locally | Hosted migration drift remains unresolved; broader final package review remains MOP-5 |
| `ESO-DATA-04` | Tree `F-06`, `M-01` | MOP-3/MOP-6 | `supabase/migrations/20260625193000_estimate_tree_delete_authority_and_authz.sql`; `src/lib/estimates/actions.ts`; focused tests | RED-to-GREEN action/schema tests prove tree delete RPC metadata is consumed for `deletedNodeIds`/`fallbackNodeId`; adjacent tree delete tests pass; MOP-6 linked provider function-catalog proof | Pass locally and linked RPCs applied | Migration-history drift remains unresolved; version row not recorded by direct scoped SQL apply |
| `ESO-DATA-05` | Tree `M-02/M-03` | MOP-3/MOP-6 continuation | `supabase/migrations/20260625221500_estimate_nodes_numeric_sort_order.sql`; `src/lib/estimates/estimate-tree-reorder.ts`; `src/lib/estimates/actions.ts`; `src/lib/repositories/workspace-repository.ts`; `src/lib/ai/package-builder/schemas.ts`; focused tests | Focused numeric sort matrix passed 4 files / 60 tests; broader affected tree/source matrix passed 8 files / 104 tests; provider dry-run rollback passed; scoped provider apply/readback shows `numeric(20,4)`, preserved tab constraints/indexes, numeric create-node overload, no integer create-node overload, and remote history applied | Pass locally and linked provider-applied | Unrelated hosted migration-list drift remains; full `pg_dump` backup was blocked by Docker, so scoped `/tmp` JSON backup was captured before apply |
| `ESO-AUTHZ-01` | Center `ESC-P1-07`, tree `F-19/T-04`, right permission docs | MOP-0-MOP-5 | `src/lib/estimates/actions.ts`; `supabase/migrations/20260625193000_estimate_tree_delete_authority_and_authz.sql`; `src/components/workshop/EstimateSheetContent.tsx`; authz/security/MOP-4 tests | Tree actions deny viewers before write RPCs; center custom add-library events and insert/replace/template/source entry points deny read-only mutations with sanitized telemetry | Pass locally for MOP-4 | Disabled-reason polish and final package review remain MOP-5 |
| `ESO-RIGHT-01` | Right `F-01/F-06`, `Task 1.1` | MOP-1 | `src/components/workshop/component-library/index.tsx`; `PreviewPanel.tsx`; `tree/LibraryTree.tsx`; `tree/types.ts`; focused tests | Archive RED->GREEN in `component-library-ui.test.tsx`; focused MOP-1 suite; type-check; `git diff --check` | Pass | Restore is not offered in this sidebar; server actions mocked locally, hosted drift unchanged |
| `ESO-RIGHT-02` | Right `F-03/F-05`, `Task 1.2/1.3` | MOP-1 | `AddComponentModal.tsx`; right-sidebar action props; focused tests | Duplicate identity RED->GREEN; row context menu proves local Edit/Duplicate removed; focused MOP-1 suite | Pass | Duplicate persisted path not added; affordance removed from this sidebar |
| `ESO-RIGHT-03` | Right `F-10`, `Task 1.5` | MOP-1 | `src/components/workshop/component-library/index.tsx`; `component-library-ui.test.tsx` | Late RED proved `Add Template Group` still existed; GREEN proves affordance absent and Add Template remains | Pass | No new persistent template-group table added by design |
| `ESO-RIGHT-04` | Right `F-04/F-11`, `Task 1.4/1.6/1.7` | MOP-1/MOP-6 | `src/components/workshop/component-library/index.tsx`; `src/lib/component-library/library-telemetry.ts`; `src/lib/component-library/actions.ts`; `supabase/migrations/20260625203000_component_library_telemetry_events.sql`; focused tests | Latest-wins project-source search test; snapshot-copy preview labels; raw-query telemetry privacy lock; durable telemetry sink and provider proof | Pass | Browser proof skipped because claims are jsdom/source/provider covered |
| `ESO-TREE-01` | Tree `F-02/F-27`, `C5` | MOP-3 | `src/lib/estimates/estimate-tree-reorder.ts`; `tests/vitest/estimate-tree-reorder.test.ts` | RED-to-GREEN signature test proves row-only total/item edits do not change prop-sync signature; name/order changes still do | Pass | `EstimateTreeNode` still lacks explicit `sortOrder`/tab fields in UI type; current child order/path cover navigation correctness |
| `ESO-TREE-02` | Tree `F-01/F-07/F-17`, `P3`, `Q-06/Q-14` | MOP-3/MOP-4 | Existing tree component/state code; `src/components/workshop/component-library/templates.ts`; adjacent tests | Tree DnD, context menu, bulk selection, refetch-on-mount, shared event validators, and cache/selection-adjacent guardrails pass | Pass locally | Broader final package review remains MOP-5 |
| `ESO-TREE-03` | Tree `Q-19/T-13` | MOP-3/MOP-5 | Existing share/proxy/header code; share tests | Share no-store/header smoke and share tree a11y tests pass | Pass for MOP-3 coverage | Broader responsive/read-only UX remains MOP-5 |
| `ESO-CONTRACT-01` | Center `M-6/M-6b`, right emitters, tree external drops | MOP-4 | `src/components/workshop/estimate-sheet/rows/constants.ts`; `src/components/workshop/component-library/templates.ts`; center/right/row consumers; parser tests | Shared library drag/custom-event parser and template/project-source validators pass; malformed library events no-op with telemetry and no mutation | Pass locally | Browser drag proof skipped because parser/event claims are covered by unit/jsdom tests |
| `ESO-CONTRACT-02` | Center `Q18`, right recents/success, tree dispatch | MOP-1/MOP-4/MOP-6 | `src/components/workshop/component-library/index.tsx`; `src/components/workshop/EstimateSheetContent.tsx`; library insert tests; durable telemetry files | Right fallback dispatch waits for center acknowledgement; invalid/read-only custom events prevent default and do not mutate; telemetry sink is durable and best effort | Pass locally/provider for telemetry | Browser proof skipped because parser/event claims are covered by unit/jsdom/provider checks |
| `ESO-UX-01` | `DESIGN.md`, UX lane | MOP-5 | None | Pending responsive/layout proof | Not started | MOP-5 pending |
| `ESO-UX-02` | Center/right/tree read-only docs | MOP-4/MOP-5 | `src/components/workshop/EstimateSheetContent.tsx`; library insert/read-only tests | Read-only custom-event mutation denial and telemetry proof pass | Partial pass | Disabled-reason polish remains MOP-5 |
| `ESO-A11Y-01` | Center `M-6`, tree `F-11/P5` | MOP-4/MOP-5 | `src/components/ui/tree-panel-header.tsx`; cost-input/dialog tests | Dialog waits, command/keyboard insert coverage, and explicit tab-search `role="search"` pass in jsdom | Partial pass | Broader ARIA/live-region proof remains MOP-5 |
| `ESO-A11Y-02` | Center `M-8`, UX lane | MOP-5 | None | Pending ARIA/table/live-region tests | Not started | MOP-5 pending |
| `ESO-PERF-01` | Center `M-18/M-19`, tree `P2`, right `3.3/3.4` | MOP-5 | None | Pending perf/unit/large-data proof | Not started | MOP-5 pending |
| `ESO-OPS-01` | Center `M-0T/M-0R`, right `23/24/31`, tree `P8` | MOP-0/MOP-6 | `supabase/migrations/20260625203000_component_library_telemetry_events.sql`; `src/lib/component-library/library-telemetry.ts`; `src/lib/component-library/actions.ts`; `src/components/workshop/component-library/index.tsx`; telemetry tests/provider evidence | Durable telemetry sink created and linked-provider metadata proof captured; async telemetry failures are non-blocking; redaction tests pass | Partial pass | Rollback drill, beta observation window, and migration-history reconciliation remain open |
| `ESO-TEST-01` | All validation plans | All phases | MOP-0 through MOP-4 evidence files and focused tests | MOP-0 baseline plus MOP-0.5 through MOP-4 RED->GREEN evidence; type-check and diff-check pass after each completed slice | In progress | MOP-5 final review and UltraQA pending |

## Validation Evidence

MOP-0 local baseline:

- `git status --short`: passed. Output showed unrelated
  `src/components/landing-v3/landing-v3.module.css` plus new `.ai` evidence
  files.
- `bun run type-check`: passed.
- `bun x vitest run tests/vitest/library-source-trust.test.ts
  tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1`: passed,
  2 files / 10 tests.
- `bun x vitest run tests/vitest/estimate-sheet-actions-authz.test.ts
  tests/vitest/estimate-row-tree-patch.test.ts --maxWorkers=1`: passed,
  2 files / 15 tests.
- `bun x vitest run tests/vitest/estimate-tree-reorder.test.ts
  tests/vitest/share-no-store-invariants.test.ts
  tests/vitest/shared-link-header-smoke-script.test.ts --maxWorkers=1`:
  passed, 3 files / 32 tests.
- `bun x vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts
  tests/vitest/templates-tree-performance.test.ts --maxWorkers=1`: passed,
  2 files / 10 tests.

MOP-0 hosted provider preflight:

- Project ref and linked-project JSON both point at `ebxxqidacheyapmmzavr`.
- Migration list and SELECT-only metadata introspection completed against the
  linked remote.
- No hosted write, destructive action, provider setting change, dump, or deploy
  was performed.

MOP-0.5 quick UI/a11y slice:

- Initial RED command failed as expected:
  `bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx
  tests/vitest/estimate-sheet-tree-dom.test.tsx
  tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1`.
- GREEN focused MOP-0.5 tests passed: 3 files / 14 tests.
- Adjacent side-panel governance tests passed:
  `tests/vitest/project-dashboard-side-panel-ui.test.ts` and
  `tests/vitest/estimate-side-panel-rails.test.ts`, 2 files / 6 tests.
- `bun run type-check` passed after implementation and stale-test updates.
- `git diff --check` passed.
- Browser proof intentionally skipped: this slice asserts static DOM/a11y
  relationships and copy presence, which are covered by jsdom/source tests.

MOP-1 right-sidebar persistence-honesty slice:

- Initial RED command failed as expected:
  `bun x vitest run tests/vitest/component-library-ui.test.tsx
  tests/vitest/library-add-component-modal-a11y.test.tsx
  tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1`.
- RED failures covered local-only delete/duplicate/edit copy, live/read-through
  project-source preview labels, and duplicate identity whitespace matching.
  A later focused RED pass on `component-library-ui.test.tsx` failed on the
  remaining local-only `Add Template Group` affordance.
- GREEN focused MOP-1 tests passed: 3 files / 105 tests.
- `bun run type-check` passed after implementation.
- `git diff --check` passed.
- Browser proof intentionally skipped: this slice asserts action invocation,
  DOM labels, jsdom-visible async search ordering, and telemetry sanitization.
  No browser-only interaction claim was introduced.

MOP-2 center integrity and trust-gate slice:

- RED focused command failed as expected before implementation:
  `bun x vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts
  tests/vitest/estimate-sheet-version-control-actions.test.ts
  tests/vitest/estimate-sheet-actions-authz.test.ts
  tests/vitest/estimate-sheet-center-atomic-contracts.test.ts
  tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx
  --maxWorkers=1`.
- RED failures covered missing atomic center migration, missing generated RPC
  types/action exports, center `moveRowComponent` still using two `replaceRow`
  calls, selected row delete still looping single-row deletes, and direct
  project-source full-tree application.
- GREEN focused MOP-2 tests passed: 5 files / 55 tests.
- `bun run type-check` passed after migration/type/action/hook/component
  implementation.
- `bun x vitest run tests/vitest/project-source-insert-action.test.ts
  --maxWorkers=1` passed, 1 file / 7 tests.
- `git diff --check` passed.
- Additional adjacent run
  `bun x vitest run tests/vitest/live-estimate-node-route.test.ts
  tests/vitest/project-source-insert-action.test.ts --maxWorkers=1` found one
  stale unrelated source assertion in `live-estimate-node-route.test.ts`
  expecting an inline estimate href string instead of the current
  `getEstimateHref` helper. This was not used as MOP-2 completion evidence.
- Hosted Supabase DDL was not applied because MOP-0 recorded linked migration
  drift. The migration and generated types are local forward changes only.
- Browser proof intentionally skipped: the changed claims are SQL/source,
  server-action, query-hook, and jsdom DOM rollback behavior.

MOP-3 tree security, delete authority, and reconciliation slice:

- RED focused command failed as expected before implementation:
  `bun x vitest run tests/vitest/estimate-tree-reorder.test.ts
  tests/vitest/estimate-sheet-actions-authz.test.ts
  tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1`.
- RED failures covered row-only edits changing the tree content signature and
  tree mutation actions reaching write paths without an app-level viewer denial.
- GREEN focused MOP-3 schema/action/signature tests passed: 4 files / 64
  tests.
- Adjacent tree UI race/regression tests passed: 4 files / 49 tests.
- Security/action regression tests passed: 2 files / 43 tests.
- Share/cache/a11y regression tests passed: 3 files / 19 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- Hosted Supabase DDL was not applied because MOP-0 recorded linked migration
  drift. The tree authority migration is a local forward change only.
- Browser proof intentionally skipped: the changed claims are SQL/source,
  server-action, signature, and jsdom-covered tree interaction behavior.

MOP-4 shared interaction and feedback contracts slice:

- Initial focused tests failed as expected before implementation on missing
  shared parser/event contracts, malformed custom-event rejection, read-only
  custom-event denial, right-sidebar acknowledgement, and shared
  template/project-source validators.
- Parser/event contract tests passed: 1 file / 5 tests.
- Center library insert contract tests passed: 1 file / 27 tests.
- Cost-input interaction tests passed: 1 file / 40 tests.
- MOP-4 matrix passed:
  `tests/vitest/estimate-library-item-insert-contract.test.ts`,
  `tests/vitest/estimate-sheet-library-insert.test.tsx`,
  `tests/vitest/estimate-sheet-cost-inputs.test.tsx`,
  `tests/vitest/estimate-template-drop-zones.test.tsx`,
  `tests/vitest/reusable-source-drag.test.ts`, and
  `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx`, 6 files /
  92 tests.
- Authz/telemetry guardrails passed:
  `tests/vitest/estimate-sheet-actions-authz.test.ts` and
  `tests/vitest/library-telemetry-emit.test.ts`, 2 files / 16 tests.
- Cache/selection-adjacent guardrails passed:
  `tests/vitest/estimate-workspace-client-cache.test.tsx` and
  `tests/vitest/estimate-sheet-tree-dom.test.tsx`, 2 files / 13 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- Browser proof intentionally skipped: this slice asserts parser, DOM
  custom-event, read-only authz, telemetry payload, jsdom interaction, type,
  and diff-hygiene claims.

MOP-5 accessibility, performance, and observability slice:

- Added tree primitive keyboard support for typeahead, F2 rename shortcut,
  Shift+F10/context-menu shortcut callback, and ArrowLeft/ArrowRight
  expand/collapse/parent-child navigation without focus theft from inline
  rename inputs.
- Added estimate-tree F2 inline rename, Shift+F10 context menu integration, and
  a keyboard-accessible `Move...` dialog validated by `validateEstimateTreeDrop`.
- Added center-sheet in-card replace and move picker buttons. The dialogs reuse
  existing replace/source-trust review and atomic move paths, and center moves
  now respect read-only edit authority. The replacement picker also triggers
  the existing lite library lazy query when opened without server-provided
  library data.
- Added explicit `scope="col"` row-table header semantics.
- Center-sheet picker regression passed: 1 file / 42 tests.
- MOP-5 interaction matrix passed after the editable-target guard: 4 files /
  99 tests.
- Render/performance guardrails passed: 6 files / 22 tests.
- Render baseline regenerated and passed: 1 file / 3 tests, output
  `evidence/implementation-20260625T095050Z/mop5-estimate-sheet-render-baseline.json`.
- Observability guardrails passed: 4 files / 111 tests.
- `bun x tsc --noEmit --incremental false` and `bun run type-check` passed.
- Browser proof intentionally skipped: the asserted claims are keyboard event
  routing, modal DOM behavior, table semantics, telemetry emission, type safety,
  and local jsdom render budgets.

## Review / QA Status

- Code review: local final diff review complete; findings fixed for replacement
  picker lazy loading and tree typeahead editable-target handling.
- Architect review: local final integration review complete; no unresolved
  boundary issues found in the MOP-5 keyboard/picker wiring.
- UltraQA: local adversarial audit complete; no open MOP-5 blocker remains.
- MOP-0 through MOP-5 local completion audit: ready for a scoped report. Known
  residual gaps are documented in the evidence files: hosted Supabase
  migrations were not applied due linked drift, browser automation was
  intentionally skipped, and unrelated pre-existing/parallel worktree diffs
  remain outside the MOP-0 through MOP-5 completion claim.

## MOP-6 Continuation Evidence

Slice 1:

- Implemented right-sidebar `Task 2.4` collapse persistence in
  `src/components/workshop/ResizableSidePanel.tsx` using the existing panel
  storage-key contract.
- Hardened proposal workbook export download in
  `src/components/workshop/EstimateSheetContent.tsx` with explicit
  same-origin fetch credentials.
- Added regression coverage in
  `tests/vitest/resizable-side-panel-a11y.test.tsx` and
  `tests/vitest/estimate-sheet-center-atomic-contracts.test.ts`.
- Validation passed:
  `bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx tests/vitest/estimate-sheet-center-atomic-contracts.test.ts --maxWorkers=1`
  (2 files / 6 tests), `git diff --check`, and `bun run type-check`.
- Remaining MOP-6/provider-proof work is not complete.

Slice 3:

- Reconciled the remaining-deferrals subagent wave against the current dirty
  worktree and source-ID appendix. The source folders are still not fully
  implemented; broad undo, right reducer extraction, numeric sort migration,
  tree lazy/realtime v2, and product-specific right `Sources` drawer proof
  remain separate unsafe or proof-limited slices.
- Implemented tree `F-23` route parsing by replacing pathname segment parsing
  in `src/components/workshop/EstimateSheetTree.tsx` with `useParams` for the
  route `[nodeId]`.
- Updated adjacent tree tests to mock `useParams` and keep route-repair
  coverage aligned with Next.js App Router semantics.
- Reclassified the shared compact side-panel drawer as source/jsdom-proved but
  not browser/product-proved. `resizable-side-panel-a11y.test.tsx` proves the
  generic trigger/dialog/focus-return path; it does not prove the stricter
  dedicated right `Sources` drawer spec, real viewport layout, scroll lock,
  overflow, or focus-trap behavior.
- Validation passed:
  `bun x vitest run tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-node-icon.test.tsx tests/vitest/estimate-tree-filter.test.tsx tests/vitest/estimate-tree-modal.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-refetch-on-mount.test.tsx --maxWorkers=1`
  (8 files / 81 tests), `bun run type-check`, and `git diff --check`.
- Remaining MOP-6 work is not complete; the correct status is implemented by
  row with explicit proof-limited/deferred slices, not "everything implemented."

Slice 2:

- Verified right-sidebar `Task 3.2` thumbnail rendering as already implemented
  in current source: repository rows map `thumbnail_path` / price-option
  `thumbnailPath` into `imageUrl`, and sidebar component rows render sanitized
  fixed thumbnails with placeholder fallback.
- Validation passed:
  `bun x vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1`
  (1 file / 93 tests) and
  `bun x vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/component-library-helpers.test.ts tests/vitest/library-source-trust.test.ts --maxWorkers=1`
  (3 files / 118 tests).
- A first combined run exposed one transient unrelated
  `component-library-ui.test.tsx` folder-create cleanup timing failure; the
  failing case and then the full file passed on rerun.
- Remaining MOP-6/provider-proof work is not complete.

Slice 4:

- Implemented product-specific compact access to the estimate right sidebar:
  `EstimateSheetContent` now exposes a below-desktop `Sources` header action
  wired to `EstimateRightSidebar`, and `EstimateRightSidebar` renders the same
  source body inside either the desktop `ResizableSidePanel` or a compact
  `Sheet`/`Dialog` drawer.
- Preserved the shared panel behavior for other consumers by adding a
  `compactDrawer` opt-out instead of replacing the generic compact drawer.
- Added focused regression coverage for real source tools in the compact
  drawer, generic drawer opt-out, lazy-loaded sheet wiring, Escape ordering, and
  source-level contracts.
- `e2e/estimate-sources-drawer.spec.ts` is available as the gated route-level
  browser harness, but was not proof-run in this shell.
- Validation passed:
  `bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1`
  (5 files / 117 tests), `bun run type-check`, and `git diff --check`.
- Browser proof remains open because this shell has no provider/auth Playwright
  environment; do not claim real viewport sizing, focus trap, scroll lock,
  return-focus behavior, or overflow safety from this slice.

Slice 5:

- Implemented right-sidebar `F-13` / `Task 3.3` reducer extraction by moving
  the monolithic field reducer into `use-estimate-right-sidebar-state.ts`.
  The sidebar now composes chrome, library, project, and templates state hooks
  instead of one full-object reducer.
- Moved template prop reconciliation into the templates hook, preserving
  optimistic local templates while removing render-time ref writes.
- Converted `EstimateRightSidebarBase` into a thin memoized wrapper around the
  internal controller hook so React Doctor no longer reports this sidebar
  component as `no-giant-component`.
- Validation passed:
  `bun x eslint src/components/workshop/component-library/index.tsx src/components/workshop/component-library/use-estimate-right-sidebar-state.ts`,
  `bun run type-check`,
  `bun x vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/resizable-side-panel-a11y.test.tsx --maxWorkers=1`
  (5 files / 117 tests), `git diff --check`, and changed-file
  `bun run doctor -- --scope files --base HEAD --no-score --blocking none --no-dead-code --no-color --verbose`.
- React Doctor changed-file output still reports unrelated/adjacent warnings
  such as `ResizableSidePanel` giant-component and inherited prop-sync warnings,
  but no longer reports `EstimateRightSidebarBase` as giant.
- React DevTools active-tab rerender profiler proof was not run and remains an
  explicit evidence gap.

Slice 6:

- Implemented migration `20260625221500_estimate_nodes_numeric_sort_order.sql`
  to convert `estimate_nodes.sort_order` from integer to `numeric(20,4)`.
- Rewrote active estimate-node RPC sort-order contracts from integer to
  numeric and removed the old integer create-node overload.
- Preserved tab-aware unique sort constraints and parent/sort indexes.
- Updated tree reorder planning, repository mapping, estimate tree types,
  package-builder parsing, and action validation so non-integer sort-order
  values flow through as numbers.
- Ran a scoped provider rollback dry run, applied the migration with scoped SQL,
  repaired remote migration history for `20260625221500`, and confirmed
  provider readback.
- Validation passed: affected numeric/source matrix 8 files / 104 tests,
  `bun run type-check`, targeted ESLint, `git diff --check`, provider rollback
  dry run, provider apply, migration repair, and provider readback.

Slice 7:

- Implemented tree F-24 by keeping the inline rename affordance visible while a
  rename save is pending, with disabled controls and a `Saving...` status.
- Implemented tree F-25 by scrolling newly created rows into view after
  optimistic create.
- Closed tree F-26 by documenting/proving the current append-as-child placement
  decision rather than treating it as lazy/realtime work.
- Revisited broad center/tree undo and classified it as a separately scoped
  architecture feature at that point: current rollback-on-failure was
  implemented, but undo after successful save/delete needed restore data,
  ordering/conflict semantics, UI policy, and API/RPC work. Slice 11 later
  implemented center row-delete restore, and Slice 13 later implemented
  tree/subtree delete Undo.
- Revisited lazy subtree loading and realtime-v2: current realtime
  cursor/presence exists; lazy subtree loading requires a subtree fetch/merge
  protocol and per-node remote loading state; realtime-v2 needs a concrete
  contract before implementation.
- Validation passed: tree polish matrix 3 files / 53 tests, `bun run
  type-check`, targeted ESLint for the changed tree component/tests, and the
  read-only lazy/realtime architecture lane reported 2 files / 13 tests passed.

Slice 8:

- Implemented center `ESC-P3-17` by replacing missing-image Unsplash fallback
  tables with generated local SVG placeholders shared by component-library
  helpers, activity-history material cards, and seed fallback inference.
- Implemented center `ESC-P3-23` as a scoped same-scope activity-history
  reload debounce. Filter/search churn waits 200ms after an initial load while
  explicit scope navigation remains immediate for responsiveness.
- Implemented center `ESC-P3-24` by offsetting the global toast viewport above
  the bottom dock and safe-area inset.
- Implemented center `M-27` by surfacing a proposal preview warning when the
  generated preview includes unsaved editable row changes.
- Revisited center `M-21` through `M-24` and classified the component/template
  insertion/history/proposal extraction work as refactor-scope because the
  source plan requires characterization tests and behavior locks before moving
  those hot flows out of `EstimateSheetContent.tsx`.
- Validation passed:
  `bun x vitest run tests/vitest/component-library-helpers.test.ts tests/vitest/toast.test.tsx tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
  (4 files / 57 tests), targeted ESLint for the changed center/fallback/toast
  files and tests (0 errors, existing unused-symbol warnings only), and `bun
  run type-check`.

Slice 9:

- Re-ran the final source-ID audit and confirmed the source folders were still
  not fully implemented.
- Classified the then-open rows as proof-limited or architecture/refactor-scope:
  F-13 React DevTools profiler proof, broad undo, center M-21 through M-24,
  lazy subtree loading, and realtime-v2.
- Found the right drawer Playwright blocker was stale route/provider fixture
  data rather than a completed browser proof.

Slice 10:

- Recovered the right `Sources` drawer browser proof by fixing stale route
  targeting, dev-auth cookie setup, search Escape sequencing, and trigger focus
  before dialog open.
- Local Chromium proof passed at 1023px and 390px, closing the below-1024
  drawer viewport/focus/overflow gap locally.
- Validation passed: drawer Playwright 2 tests, focused drawer/source tests
  2 files / 103 tests, `bun run type-check`, and `git diff --check`.

Slice 11:

- Implemented center row-delete post-success Undo with
  `restore_deleted_estimate_rows_with_history` and migration
  `20260626013000_estimate_row_delete_undo_rpc.sql`.
- Wired the restore action through estimate actions, row mutations, and
  `EstimateSheetContent` single/bulk delete success toasts.
- Updated row-delete copy to the narrower current contract: center rows can be
  restored with Undo after save/delete. Slice 13 later closed the parallel tree
  node/subtree delete Undo path.
- Validation passed: row-delete Undo matrix 3 files / 49 tests,
  `bun run type-check`, `git diff --check`, provider scoped SQL apply,
  migration repair, live function/grant readback, and migration-list alignment.

Slice 12:

- Extracted pure center helper/model logic for M-21 through M-24 into
  `proposal-preview-model.ts`, `template-insertion-model.ts`, and
  `activity-scope-tree.ts`.
- Added direct helper/model tests plus a batched template custom-event
  regression lock.
- Updated row-details modal assertions to await the native dialog open path
  after React state commits.
- Validation passed: center extraction/refactor matrix 11 files / 102 tests,
  `bun run type-check`, and `git diff --check`.
- Boundary: this closes pure helper/model extraction only. Full
  `EstimateSheetContent.tsx` hook/component decomposition remains open.

Slice 13:

- Implemented tree/subtree post-success delete Undo with
  `restore_deleted_estimate_nodes_with_history` and migration
  `20260626023000_estimate_node_delete_undo_rpc.sql`.
- Added canonical deleted-node snapshots, persisted deleted subtree row
  snapshots in tree delete history payloads, and raised the bounded event
  snapshot cap to 5 MB.
- Wired delete `eventId` through single/bulk tree delete actions and added
  `restoreDeletedEstimateNodes` with tab-aware tree refresh.
- Added tree success-toast `Undo` actions for single and bulk delete; Undo
  restores the refreshed tree and repairs selection/URL back to the deleted
  route when deletion forced a fallback.
- Validation passed: focused tree/action/schema matrix 4 files / 82 tests,
  `bun run type-check`, `git diff --check`, provider scoped SQL apply,
  migration repair, live function/grant readback, and migration-list alignment.
- Boundary: this closes post-success tree/subtree delete Undo only. It does not
  claim a general undo stack for every tree edit.

Slice 14:

- Extracted the center `M-22` estimate-template insertion orchestration into
  `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`.
- Moved whole-template insert, batched multi-template insert, template-node
  subtree insert, template-id lookup, left-tree template custom-event handling,
  optimistic tree/row insertion, stale-response revision guards, rollback, and
  error-toast behavior out of `EstimateSheetContent.tsx`.
- Kept project-source subtree insertion in `EstimateSheetContent.tsx` because
  it is the separate U2 source-copy RPC flow, not the estimate-template
  insertion hook.
- Validation passed: `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts --maxWorkers=1`
  (2 files / 34 tests), `bun run type-check`, and scoped `git diff --check`.
- Boundary: this closes `M-22`. Full center hook/component decomposition
  remained open for `M-21`, `M-23`, and `M-24`; Slice 15 later closed `M-24`
  and Slice 16 later closed `M-21`.

Slice 15:

- Extracted the center `M-24` proposal-preview controller orchestration into
  `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts`.
- Moved proposal export tab-scope selection, preview signature composition,
  preview model building, export settings updates, stale/current status,
  download availability, blob download error handling, and dialog focus
  restoration out of `EstimateSheetContent.tsx`.
- Kept the reducer-backed proposal state in `EstimateSheetContent.tsx` and the
  already-extracted pure helpers in `proposal-preview-model.ts`.
- Validation passed: `bunx vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts --maxWorkers=1`
  (2 files / 19 tests), `bun run type-check`, and scoped `git diff --check`.
- Boundary: this closes `M-24`. Full center hook/component decomposition remains
  open at this point for `M-21` row handlers and `M-23` activity-history
  controller state. Slice 16 later closed `M-21`.

Slice 16:

- Extracted the center `M-21` row-handler/controller orchestration into
  `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`.
- Moved editable-row resync, express draft insert/retry/delete handling, row
  save buffering, library insert/replace trust gates, clear-component,
  project-specific detach, library promotion, component replace/move picker
  actions, single-row delete Undo, and selected-row bulk delete Undo out of
  `EstimateSheetContent.tsx`.
- Validation passed: `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
  (4 files / 80 tests), `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1`
  (1 file / 32 tests), and `bun run type-check`.
- Boundary: this closes `M-21`. Full center hook/component decomposition remains
  open only for `M-23` activity-history controller state.

Slice 17:

- Extracted the center `M-23` activity-history controller orchestration into
  `src/components/workshop/estimate-sheet/use-estimate-history-panel.ts`.
- Moved activity scope item construction, selected activity scope and row
  detail derivation, history filter/reset/reload state transitions,
  request-generation guards, initial history fetch, pagination fetch, modal
  focus restoration, and Escape-key close handling out of
  `EstimateSheetContent.tsx`.
- Kept the reducer-backed activity/history state and modal rendering in
  `EstimateSheetContent.tsx`, with the controller behavior delegated through
  the hook return API.
- Validation passed: `bun run type-check`,
  `bunx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts tests/vitest/estimate-sheet-row-details-crud.test.tsx --maxWorkers=1`
  (4 files / 37 tests), and
  `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1`
  (1 file / 32 tests).
- Boundary: this closes `M-23` and the remaining center controller extraction
  gap. Full source-folder completion remains false until F-13 React DevTools
  active-tab profiler proof, lazy subtree loading, and a concrete realtime-v2
  collaboration contract are handled.

Slice 18:

- Added
  `tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx` for
  the right-sidebar `F-13` active-tab render-scope proof.
- The test renders the real `EstimateRightSidebar` shell inside React
  `<Profiler>`, mocks only `LibraryTree` and `TemplatesTree`, and asserts that
  active-tab interactions commit React work while the inactive tab tree stays at
  zero renders.
- Updated
  `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx` so the
  static source-review gate check follows the M-21 extraction boundary: gate
  logic is in `use-estimate-row-handlers.ts`; modal copy remains in
  `EstimateSheetContent.tsx`.
- Validation passed:
  `bunx vitest run tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx --maxWorkers=1`
  (1 file / 1 test),
  `bunx vitest run tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/resizable-side-panel-a11y.test.tsx --maxWorkers=1`
  (6 files / 118 tests), `bun run type-check`, and changed-file React Doctor
  exit 0.
- Boundary: this closes F-13 with automated React Profiler evidence rather
  than a manual React DevTools export. Full source-folder completion remains
  false until lazy subtree loading and a concrete realtime-v2 collaboration
  contract are handled.

Slice 19:

- Implemented the tree lazy-subtree loading contract and UI hydration path:
  `EstimateTreeNode` now supports optional `childrenLoaded` / `rowItemsLoaded`
  metadata, `estimate-tree-lazy.ts` owns subtree payloads, merge semantics,
  request-id freshness guards, and per-node hydration state, and
  `EstimateSheetTree.tsx` hydrates partial branches on expand.
- Added a bounded server-side subtree reader in `workspace-repository.ts` plus
  `subtree-actions.ts` / `subtree-client.ts` so the client can fetch one
  branch without forcing a full-tree reload. Initial trees that hit the existing
  load-limit state mark terminal nodes as lazy candidates.
- Added `estimate-tree-realtime-contract.ts` as the concrete v2 tree
  collaboration contract for subtree request/load, last-write-wins branch
  change, and full-refetch request events. This is intentionally separate from
  the already-existing cursor/presence channel.
- Validation passed:
  `bunx vitest run tests/vitest/estimate-tree-lazy-subtree.test.ts tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx --maxWorkers=1`
  (3 files / 8 tests),
  `bunx vitest run tests/vitest/estimate-tree-refetch-on-mount.test.tsx tests/vitest/project-collaboration-realtime.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-node-icon.test.tsx tests/vitest/estimate-tree-lazy-subtree.test.ts tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx --maxWorkers=1`
  (8 files / 40 tests),
  `bunx vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1`
  (4 files / 12 tests), and `bun run type-check`.
- Boundary: this closes the lazy subtree loading and concrete realtime-v2 tree
  collaboration contract gaps. The three June 24 estimate-sheet source folders
  are implemented under this orchestration scope; no production deploy, manual
  browser matrix, or provider write is claimed for this local code slice.
