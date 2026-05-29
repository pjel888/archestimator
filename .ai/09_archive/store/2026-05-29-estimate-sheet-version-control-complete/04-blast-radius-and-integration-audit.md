# 04 Blast Radius and Integration Audit

> Historical context notice: this audit was written for the broad pre-pivot implementation surface. Use `18-current-activity-contract.md` and rerun focused impact analysis before any current Activity-only implementation slice.

## Risk Level

Expected implementation risk: **broad**.

Reason: estimate rows are central to the live estimate sheet, chart aggregation, proposal preview/export, component-library insertion snapshots, template insertion, duplicate-sheet behavior, and future immutable proposal snapshots.

## Graph and GitNexus Evidence

Code Review Graph impact for likely implementation files returned:

- 126 directly changed nodes;
- 473 impacted nodes within 2 hops;
- 114 additional files affected.

Initial planning found a stale GitNexus index from commit `f4afe70` while current commit was `93d0111`. The second pass ran `npx gitnexus analyze` successfully on 2026-05-24 and refreshed the index to 4,189 nodes, 8,301 edges, 207 clusters, and 300 flows.

Do not edit the affected symbols until exact impact analysis is rerun on the current HEAD/worktree, because implementation work may happen after this planning pass and the worktree may change again.

First-pass GitNexus impact results still show useful risk shape, but must be refreshed per-symbol before code edits:

- `EstimateSheetContent`: **HIGH** risk; 8 impacted upstream nodes, affected process `ProjectEstimateNodePage`, direct test consumers including `estimate-sheet-library-insert.test.tsx`, `estimate-sheet-cost-inputs.test.tsx`, `proposal-export-preview.test.tsx`, and `estimate-tree-context-menu.test.tsx`.
- `insertEstimateRowItemFromLibrary`: **LOW** symbol-level upstream risk; direct caller is mutation function in `use-estimate-row-mutations.ts`.
- `replaceEstimateRowItemWithLibrary`: **LOW** symbol-level upstream risk; direct caller is mutation function in `use-estimate-row-mutations.ts`.
- `updateEstimateRowItem` in `src/lib/estimates/actions.ts`: **LOW** symbol-level upstream risk; direct caller is mutation function in `use-estimate-row-mutations.ts`.

Interpretation: the server action seams are narrow, but the visible sheet component is high-risk. Implementation should keep canonical event writes behind server actions/RPCs and add minimal UI surfaces to `EstimateSheetContent`.

Third-pass correction: the row action surface in `EstimateRowItemsTable` is not a context menu. It is a 30px grid column with plain Drag, Expand, and Delete icon buttons. The plan must not assume `ActionMenuGroup` exists for row items.

## Directly Affected Areas

### Supabase

- New migration for `estimate_sheet_events` and `estimate_sheet_versions`.
- RLS policies and grants.
- Workspace reference enforcement triggers or constraints.
- RPCs/functions for atomic event writes, snapshot creation, named version creation, and restore-as-copy.
- Generated `src/lib/supabase/types.ts`.

### Server Actions and Repositories

- `src/lib/estimates/actions.ts`
  - Insert, replace, update, delete, template insert, and maybe node actions need event writes.
  - Existing `getSourceSnapshot()` and `getEstimateRowMetadata()` define the row snapshot compatibility contract.
  - Existing `duplicateEstimateSheet()` is the restore-as-copy pattern to mirror.
  - Existing `reorderEstimateTreeNodes()` and `insertEstimateTemplateIntoEstimate()` already call Supabase RPCs. History must be added inside those RPC transactions or wrapper RPCs, not as a server-action follow-up insert.
  - Existing actions use `requireCurrentUserContext()` for user context in several estimate writes. History RPCs must reconcile that with `auth.uid()` fallback behavior.
  - Existing `revalidatePath()` calls remain in server actions after RPC success.
  - Named version creation and restore-as-copy should live here or in a split `src/lib/estimates/version-actions.ts` if file size becomes unclear.
- `src/lib/repositories/workspace-repository.ts`
  - Current tree projection should not be widened unnecessarily.
  - Version/history reads may belong in a new `estimate-version-repository.ts`.
- `src/lib/estimates/estimate-row-tree-patch.ts`
  - Preserve update-only optimistic cache reconciliation; do not make it the canonical history builder.

### UI

- `src/components/workshop/EstimateSheetContent.tsx`
  - `EstimateSheetHeader` is a private local function in this file, not an exported reusable component.
  - Sheet toolbar version/history entry should be wired through local props/state or a deliberate extraction.
  - Row-level history entry should wire the existing inert Expand icon slot to a newly implemented row details/history panel, not a non-existent row context menu.
  - Compare/restore UI trigger points.
- Shared primitives should be used for modal/drawer/list controls; no raw feature-local button/search/dropdown patterns.
- `ActionMenuGroup` and `ContextActionMenuContent` remain relevant for estimate tree node actions, not current estimate row item actions.

### Existing Feature Surfaces

- Estimate duplication: current duplicate-sheet behavior copies estimate record, nodes, and row items. Version restore-as-copy should reuse or mirror that server-side pattern rather than inventing in-place restore first.
- Project charts: `project-charts-repository.ts` reads directly from `estimate_row_items` via `loadRowFacts()`. Charts should not join or read `estimate_sheet_events` / `estimate_sheet_versions`.
- Proposal export: phase 1 export is generated on demand and already derives `versionLabel` from `estimate.metadata`. Named version creation must reconcile with that metadata reader without activating proposal issuance.
- Templates: template insertion creates nodes and rows through `insert_estimate_template_into_estimate`; event logging should record one high-level template event and optionally child row events, but must not mutate template source data.
- Component library: row source replacement should preserve component version/price snapshot fields. Component-library versioning remains separate.

## Main Risks

1. **Event ordering risk:** rapid row edits already use per-row operation ids on the client. Event ordering must be server-time/correlation based, not client optimistic order.
2. **False history risk:** failed optimistic edits must not appear in the log.
3. **Delete context risk:** hard deletes remove `estimate_row_items`; events must snapshot material/source fields so deleted row history remains intelligible.
4. **Performance risk:** full snapshots can grow large. Store full snapshots for named versions, not for every keystroke.
5. **RLS risk:** version/event rows must be workspace-scoped and not directly writable by unauthorized users.
6. **UI density risk:** history controls must stay compact and off the main row grid by default.
7. **Proposal ambiguity risk:** named versions are not issued proposal snapshots. Keep labels distinct.
8. **Atomicity risk:** row mutations and event writes touch production paths. Split success is unacceptable; RPCs must fail the whole mutation if the matching event cannot be persisted.
9. **Test harness risk:** current tests cover spreadsheet inputs and library insert/replace behavior, but atomic database transactions may need schema/RPC file-content tests before live Supabase execution tests are available.
10. **UX assumption risk:** row actions are not currently menus. Converting the 30px action column to a dropdown is a design change and should not be hidden inside version-history implementation.
11. **Metadata/version-label risk:** `sheet_code`, `estimate.metadata.version*`, and `estimate_sheet_versions.version_number` can confuse users and exports if labels are not reconciled.
12. **Performance risk:** scalar row blur saves currently perform a narrow update plus revalidation. Adding locks, snapshots, and event writes could make spreadsheet editing feel slower unless benchmarked.
13. **Concurrency risk:** simultaneous edits should be ordered by server persistence time and grouped by `correlation_id`, with same-row edits protected by row locks.
14. **Row details risk:** the row Expand icon currently has no handler or panel. Row history requires a new row details/history surface with focus management and tests.
15. **Existing RPC risk:** `reorder_estimate_nodes` and `insert_estimate_template_into_estimate` are already atomic SQL operations. Adding history outside them would violate atomicity; modifying them may affect current tested flows.
16. **Actor attribution risk:** SQL `auth.uid()` may not be populated in every server-action/dev-auth path. RPCs need explicit `acting_user_id` support from `requireCurrentUserContext()`.
17. **False proof risk:** file-content schema tests can confirm SQL text shape but cannot prove rollback, locking, RLS, or concurrent behavior.
18. **Event volume risk:** scalar row events can accumulate quickly on 200-row estimates. Events must store changed fields and compact row/source context, not full source snapshots on every blur.
19. **Idempotency risk:** RPC atomicity does not prevent duplicate writes if the transaction commits but the response is lost. History-aware RPCs need stable mutation UUID/correlation id checks under lock.
20. **Silent overwrite risk:** row locks serialize same-row edits but still allow last-write-wins. Current rows need a row revision compare-and-swap contract.
21. **Backfill operations risk:** full baseline snapshots for every existing estimate can time out inside an all-or-nothing migration. Backfill needs preflight counts, batching thresholds, and post-run byte evidence.

## Testing Risk Assessment

- `estimate-sheet-cost-inputs.test.tsx` protects the spreadsheet editing contract. New history UI must not create visible save/history layout shifts or change Enter/blur commit behavior.
- `estimate-sheet-library-insert.test.tsx` protects insert/replace/delete optimistic behavior. Event writes must preserve existing rollback semantics.
- `estimate-tree-context-menu.test.tsx` exercises the shared context/action menu pattern for tree nodes. Do not assume that coverage applies to estimate row items; row history needs its own Expand/details tests.
- Database atomicity is not provable with DOM-only Vitest or file-content schema tests. The first implementation pass should still add schema/RPC assertions for `for update`, `raise exception`, `set constraints all immediate`, partial indexes, no broad event update/delete grants, and idempotent backfill, but those tests are only static guardrails.
- Before claiming atomicity complete, run a live database integration check against local Supabase or an approved test database that proves a forced event insert failure rolls back the row/template/reorder mutation.
- Add one focused chart aggregation test or assertion that project charts continue to read current `estimate_row_items`, not `estimate_sheet_versions.snapshot`.
- Add source snapshot tests that prove event/version snapshots include fields from `getSourceSnapshot()` and `getEstimateRowMetadata()`.
- Add concurrency tests for same-row scalar edits and multi-row template/cascade events sharing `correlation_id`.
- Add idempotency tests for duplicate retry with the same mutation UUID/correlation id.
- Add row revision conflict tests that reject stale same-row update/replace/delete operations.
- Add payload-size tests for scalar, replacement/delete, and named-version snapshot JSONB.
- Add a backfill dry-run/preflight test or script output assertion before remote apply.
- Add a latency benchmark or test harness note comparing baseline row blur save latency against RPC-backed row blur save latency.

## Expected Files To Change During Implementation

- `supabase/migrations/*_estimate_sheet_version_control.sql`
- `src/lib/supabase/types.ts`
- `src/lib/estimates/actions.ts`
- possible new `src/lib/estimates/versioning.ts`
- possible new `src/lib/repositories/estimate-version-repository.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- possible new compact UI components under `src/components/workshop/estimate-version-history/`
- tests under `tests/vitest/*estimate*version*`, `estimate-sheet-library-insert.test.tsx`, `estimate-sheet-cost-inputs.test.tsx`, and schema tests.
