---
title: Estimate Sheet Performance Reliability Code Review
date: 2026-06-21
status: read-only-audit
---

# Performance, Reliability, And Code Review

Severity follows the code-review scale: P1 blocks beta-quality workflow, P2 should be fixed soon, P3 is lower-risk hardening.

## OpenCode Addendum

This revision uses only
`.ai/02_audits/OPENCODE-GLM5.2-2026-06-21-Estimate-Sheet-Plan-Audit.md` as
external audit input. It preserves the current plan's core P1/P2 findings and
adds the OpenCode corrections below:

- Template-node subtree copy should use the existing
  `insert_estimate_subtree_into_estimate_with_history` RPC before any new
  migration is considered.
- Replace-row repair must use the canonical row already returned by the RPC and
  patch client cache with the returned `rowRevision` and provenance fields.
- Several write RPCs should be hardened from workspace-membership checks to the
  same edit gate used by related insert paths.
- `rowUpdateQueuesRef` serializes scalar updates only; replace/delete/detach
  and other row mutations can still interleave with in-flight updates.
- Insert feedback should distinguish pending from persisted success; `added`
  copy should wait for the server action to resolve.
- OpenCode also flags lower-priority hardening around `Date.now()` duplicate
  ids, untyped custom event contracts, legacy `areaTree` query invalidation, and
  the missing `[nodeId]/loading.tsx` shell.

Component source labels are now a UX taxonomy, not a persistence taxonomy:
`Library Component` and `Project Component` are visible terms, while express,
detached, projection, source snapshot, and link state remain internal states.

## P1 Findings

### P1: Sister write RPCs are not consistently edit-gated

Evidence:
- OpenCode found membership-gating in
  `replace_estimate_row_item_with_history`.
- OpenCode found membership-gating in
  `delete_estimate_row_item_with_history`.
- OpenCode found membership-gating in
  `delete_estimate_node_with_history`.
- OpenCode found membership-gating in
  `update_estimate_row_item_with_history`.
- Related insert paths were later hardened to edit-gating, which makes the
  mismatch look accidental rather than intentional.

Failure mode: a workspace member without estimate edit permission could have a
direct RPC-layer path that is broader than the UI/server-action contract.

Recommended fix:
- Harden those RPCs to use the same estimate edit gate as sister write paths.
- Add authz regression tests for non-edit members on replace, row delete, node
  delete, and update.

### P1: Bulk row delete and component move use whole-tree rollback for row-scoped failures

Evidence:
- Bulk row delete loops single-row delete handlers: `src/components/workshop/EstimateSheetContent.tsx:2563`.
- Each delete captures a whole-tree/rows snapshot: `EstimateSheetContent.tsx:2532`.
- Delete rollback restores that whole snapshot: `EstimateSheetContent.tsx:2557`.
- Component move calls replace target, then clear source: `EstimateSheetContent.tsx:2522`.
- The replace and clear paths each carry whole-tree rollback callbacks: `EstimateSheetContent.tsx:2380`, `:2432`.
- The query restore guard is global tree revision based: `src/hooks/use-estimate-query.ts:71`.

Failure mode: one row operation can fail and roll back, preserve, duplicate, or
hide the visible state of another row. The row delete RPC itself is exact-row
scoped; the cascade risk is client rollback granularity and multi-step mutation
composition.

Recommended fix:
- Add a bulk row-delete path or make per-row delete rollback row-scoped.
- Model component move as one row-pair operation, or reconcile source/target rows
  independently after either partial failure.

Tests:
- Select two rows, mock one delete success and one failure, and assert only the
  failed row returns.
- Move component A -> B with target success/source failure, then target
  failure/source success.

### P1: Non-default tab reorder/delete returns the default tab tree

Evidence:
- Reorder writes returned tree into active UI: `src/components/workshop/EstimateSheetTree.tsx:611`.
- Reorder action refreshes via default tree loader: `src/lib/estimates/actions.ts:1508`.
- Default tree loader resolves default tab: `src/lib/repositories/workspace-repository.ts:2749`.
- Single delete writes returned tree: `EstimateSheetTree.tsx:996`.
- Single delete refreshes via default loader: `actions.ts:2208`.
- Bulk delete writes returned tree: `EstimateSheetTree.tsx:1097`.
- Bulk delete refreshes via default loader: `actions.ts:2281`.

Failure mode: on a non-default tab, reorder/delete can persist correctly but replace the visible tab cache with the default tab. Fallback selection and route replacement are then computed against the wrong tree.

Recommended fix:
- Thread `targetTabId`/`activeTabId` into reorder, delete, and bulk delete actions.
- Or infer affected `estimate_tab_id` from target nodes server-side.
- Refresh with `getEstimateTabTree(projectId, estimateId, tabId)` for tabbed estimates.
- Build delete fallback plans against the same tab-scoped tree.

Tests:
- Create second tab, reorder node, assert active tab cache still contains second-tab nodes.
- Delete node on second tab, assert fallback stays within second tab.
- Bulk delete on second tab, assert default tab never appears in active tab cache.

### P1: Bulk tree-node delete can partially commit

Evidence:
- Bulk delete plans selected roots: `src/lib/estimates/actions.ts:2259`.
- It then loops one RPC per root: `actions.ts:2269`.
- Each RPC calls `delete_estimate_node_with_history`: `actions.ts:2270`.
- The client rolls back the local optimistic tree after any thrown error:
  `src/components/workshop/EstimateSheetTree.tsx:1107`.

Failure mode: if root A commits and root B fails, the user sees a failed bulk
delete while the database has already deleted root A and its cascaded rows.

Recommended fix:
- Add a single transactional bulk delete RPC that validates all roots, records
  history, deletes, and returns deleted ids plus refreshed tab tree.

Tests:
- Mock or database-test a mid-bulk failure and assert no partial delete/event survives.

### P1: Tree drag-over validation rebuilds reorder plans on pointer movement

Evidence:
- Generic tree calls drag-over validation on hovered rows: `src/components/ui/tree.tsx:842`.
- It calls route-provided `canDrop` after descendant checks: `src/components/ui/tree.tsx:724`.
- Estimate tree passes drag-over through `evaluateEstimateTreeDrop`: `src/components/workshop/EstimateSheetTree.tsx:556`.
- Reorder planning removes/clones/reinserts and rebuilds signatures in `src/lib/estimates/estimate-tree-reorder.ts:293`.

Failure mode: drag movement across a large tree repeatedly traverses and clones large parts of the tree before the user drops anything.

Recommended fix:
- Split cheap hover validation from full drop planning.
- Precompute per-drag node index, ancestor sets, parent ids, sibling counts, and tree revision.
- Build the full reorder plan only on drop.

Tests:
- Benchmark drag-over handler time at 1k, 5k, and 10k nodes.
- Assert no full-tree clone occurs during hover validation.

### P1: Template-node subtree insert performs serial RPC per copied node and row

Evidence:
- Loads all template nodes and rows: `src/lib/estimates/actions.ts:2454`.
- Loops subtree nodes: `actions.ts:2502`.
- Calls `create_estimate_node_with_history` per node: `actions.ts:2507`.
- Loops subtree rows: `actions.ts:2531`.
- Calls `insert_estimate_row_item_with_history` per row: `actions.ts:2541`.
- Refreshes full tree after loop: `actions.ts:2574`.

Failure mode: inserting a reusable section with many rows becomes many sequential
round trips and a full reload. A mid-way failure can also leave a partial copied
subtree because each node/row RPC commits independently.

Recommended fix:
- Route this action through the existing
  `insert_estimate_subtree_into_estimate_with_history` RPC.
- Keep history events inside Postgres.
- Return inserted root ids and refreshed tab tree.
- Add a new migration only if the existing RPC cannot satisfy template-node
  semantics after a focused source/test check.

Tests:
- Unit test that the client action calls the existing bulk subtree RPC once.
- Performance test for 100-row subtree insert query count and latency budget.

## P2 Findings

### P2: Replacing a row from the library leaves stale row revision

Evidence:
- Client optimistically swaps replacement row: `src/components/workshop/EstimateSheetContent.tsx:2353`.
- Replace mutation uses generic mutation options: `src/hooks/use-estimate-row-mutations.ts:267`.
- Later mutations read `expectedRowRevision` from cached row: `use-estimate-row-mutations.ts:408`.
- Server action calls replacement RPC: `src/lib/estimates/actions.ts:2680`.
- OpenCode verified the RPC returns canonical row JSON; the client replace path
  does not patch it into cache.

Failure mode: next edit/delete/detach/replacement can conflict because the cached `rowRevision` was not incremented.

Recommended fix:
- Expose/extract the returned canonical row in `replaceEstimateRowItemWithLibrary`.
- Patch row cache in replace mutation success with canonical row fields, including `rowRevision`, metadata, source snapshot, unit, and link state.
- Include non-express clear paths that use replace-style row writes, so clearing
  a component cannot leave stale revision or stale canonical metadata behind.

### P2: Tab-tree query failure renders as empty tab

Evidence:
- Tab tree query returns `...query` but the render path does not branch on `isError`: `src/hooks/use-estimate-query.ts:103`.
- Loading branch is `isActiveTabTreeLoading`: `src/components/workshop/EstimateSheetContent.tsx:2819`.
- Empty branch says "This tab is empty": `EstimateSheetContent.tsx:2896`.

Failure mode: auth expiry, network loss, or provider failure can be confused with an empty tab.

Recommended fix:
- Render retryable inline error state for `tabTreeQuery.isError` and `legacyTreeQuery.isError`.
- Disable mutation controls while active tree query is in error.

### P2: Row mutation failures can roll back quietly

Evidence:
- Update mutation rolls back and marks failed but has no input `onError`: `src/hooks/use-estimate-row-mutations.ts:395`.
- Inline row commit passes rollback/onSuccess only: `src/components/workshop/EstimateSheetContent.tsx:1837`.
- Delete row passes rollback/onSuccess only: `EstimateSheetContent.tsx:2532`.

Failure mode: users may see changes snap back with no actionable message.

Recommended fix:
- Add centralized row mutation error presenter.
- Show compact persistent error near sheet header, with retry/reload guidance.
- Keep toasts for transient confirmations.

### P2: Scalar save state is global, not mutation-counted

Evidence:
- Save state is a single scalar in the row mutation hook.
- Shared mutation success marks saved unconditionally.
- Bulk row delete loops deletes from `EstimateSheetContent.tsx:2563`.

Failure mode: one mutation success can mark sheet saved while another mutation is pending or about to fail.

Recommended fix:
- Track active mutation count and last error by operation family.
- Mark saved only when active count reaches zero.
- Keep failed sticky until a later successful save or explicit retry clears it.

### P2: Project-source inserts can apply stale full-tree snapshots

Evidence:
- Project source insert starts in `src/components/workshop/EstimateSheetContent.tsx:2157`.
- Success applies returned `result.tree` directly: `EstimateSheetContent.tsx:2174`.
- Comment notes concurrent bulk source insert risk: `EstimateSheetContent.tsx:2177`.
- Bulk sidebar path loops source inserts: `src/components/workshop/component-library/index.tsx:1804`.

Failure mode: out-of-order responses can overwrite earlier inserts in the visible tree.

Recommended fix:
- Serialize project-source inserts per tab.
- Or merge returned trees by inserted subtree ids.
- Add request generation and refetch/merge stale generations.

### P2: Template insert refresh trusts caller tab id

Evidence:
- Insert refresh helper accepts caller `targetTabId`: `src/lib/estimates/actions.ts:2296`.
- Whole-template insert refreshes with it: `actions.ts:2337`.
- Multi-template insert refreshes with it: `actions.ts:2381`.
- Template-node insert refreshes with it: `actions.ts:2574`.

Failure mode: if caller tab id and target parent node tab diverge, the SQL can
commit to the parent node's tab while the action returns the caller tab tree.

Recommended fix:
- Read committed `estimateTabId` from the insert RPC result and refresh that tab.
- If the caller passes `targetTabId`, assert it matches the committed tab.

### P2: Estimate route and reusable-source payloads need explicit ceilings

Evidence:
- Route calls `resolveEstimateTabRouteContext` without `maxNodeCount` or `maxRowItemCount`: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:37`.
- Tab tree loader only applies `.limit` when options are supplied: `src/lib/repositories/workspace-repository.ts:2581`, `:2590`, `:2605`.
- Legacy tree loader behaves similarly: `workspace-repository.ts:2377`.
- OpenCode corrected the lazy library-loader claim: `loadProjectComponentLibraryLite(projectId)` is project-scoped/lite and gated by sidebar or command-palette demand.

Failure mode: very large estimates can send huge payloads into server render and
hydration; broad reusable-source searches can still materialize too much work.

Recommended fix:
- Introduce route budgets and a visible truncation state.
- Move row-heavy areas to section-on-demand loading.
- Keep the lite sidebar loader, but add budgets/pagination if project-scoped
  component/template counts grow beyond beta assumptions.
- Fetch variant/current-cost details only for visible or selected items.

### P2: Reusable project-source search can fan out across projects and tab trees

Evidence:
- Sidebar debounces server search at `component-library/index.tsx:1150`.
- `src/lib/reusable-sources/actions.ts:118` lists accessible projects.
- `reusable-sources/actions.ts:239` iterates matching estimates and loads tab trees.
- `reusable-sources/actions.ts:296` loads full outlines on expansion.

Failure mode: broad search queries in large workspaces can scan many projects/estimates/tabs and materialize large row payloads.

Recommended fix:
- Cap search results and materialization count.
- Return lightweight node hits directly from SQL.
- Load full outlines only on explicit expand.
- Track projects/estimates/tabs/nodes/rows scanned per query.

## P3 Findings And UX Polish

| Finding | Evidence | Recommendation |
| --- | --- | --- |
| Revision conflicts are generic | `src/lib/estimates/actions.ts:2660`, `:2680`, `:2741` throw raw RPC errors | Map `estimate_sheet_row_revision_conflict` to typed client copy and refetch/retry path |
| Library/template/project-source insert feedback can imply success too early | `component-library/index.tsx:1375`, `:2401`; OpenCode feedback finding | Show compact pending status, then only show "added" after persistence succeeds |
| Drop targets are too subtle during active drag | `src/components/workshop/estimate-sheet/rows/drop-zones.tsx:16`; `branch.tsx:275` | Use accent fill/ring during drag only |
| Empty drop zone prop is ignored | `drop-zones.tsx:64` | Use "Add first row to {area}" for empty areas |
| Project Component creating state is hidden | `rows/cells.tsx:253` shows failed state visibly, creating is sr-only | Add tiny visible "Creating..." or shimmer |
| Estimate-name errors are weak | `ProjectEstimateMetadataStrip.tsx:226` shows visible `!`, error text sr-only | Add inline/focus-visible compact error |
| Hardcoded blue active states | `rows/row-table.tsx:267`; `rows/cells.tsx:508` | Use sheet tokens like `accentSoft` and `ring-accent` |
| Draggable sidebar affordance could be clearer | `LibraryTree.tsx:428`; `TemplatesTree.tsx:1224` | Show small grip or tooltip on hover/focus |
| Column reset uses literal `R` | `EstimateColumnRuler.tsx:88` | Use reset icon with existing aria-label |

## Codebase Shape Notes

- `EstimateSheetContent.tsx` is doing route content, row editing, template insertion, proposal export, activity history, sidebar integration, and header action registration in one large component. Avoid a broad refactor during beta fixes, but future work should split only around real state boundaries.
- The existing query-key shape is clear: estimate detail, tabs, area tree, and tab tree. New fixes should preserve that cache model.
- Existing mutation patterns are strong where canonical server rows are returned. Prefer extending those patterns over new abstractions.
