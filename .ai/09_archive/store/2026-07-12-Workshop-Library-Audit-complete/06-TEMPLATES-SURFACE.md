# 06 — Templates Surface (Browse + Editor + Insert-Into-Estimate)

> Deep-dive into the Templates tab of `/workshop/library`. Source read
> 2026-07-12; every claim cited `file:line`.

## 1. Template data model

Tables (D1): `estimate_templates`, `estimate_template_nodes` (adjacency-list via
`parent_id`; `kind ∈ {group, area}`; only `group` at root), `estimate_template_
row_items` (line items hanging off nodes; server enforces `node.kind === "area"`
before row adds, `template-editor-actions.ts:677, 739`).

`estimate_template_row_items.source_library_item_id` is the soft FK back to
`cost_library_items.id` (no DB FK; set on library-item inserts in
`buildTemplateRowItem` `:647`; `null` for manually-typed allowance rows `:762`).
At read, `normalizeTemplateRowItem` (`repository.ts:934-996`) copies it onto
`sourceLibraryItemId` and infers `source = "library"` from its presence.
**Critically, the live lifecycle state is NOT re-read** — §4.

Read→browse→edit round-trip:
1. Read seed: `getCurrentWorkspaceEstimateTemplatesSeed` (`repository.ts:1380-1388`).
2. Browse: `TemplatesBrowsePageClient` seeds TanStack cache (`:79-84`), 5-min
   `staleTime`, queryFn `loadCurrentWorkspaceEstimateTemplates`.
3. Edit: `templates/[templateId]/page.tsx:17-19` calls `getEstimateTemplateById`
   → `TemplateEditorClient` → `useTemplateEditor`.

## 2. Template browse — optimistic mutations + rollback

`TemplatesBrowseManager.tsx` (~1200L). Cache contract in `TemplatesBrowsePageClient
.tsx:86-97`: `onTemplatesMutated` patches warm cache; `onTemplatesInvalidated`
flags stale. Manager holds `{source, items}` reducer; guard at `:787` discards
optimistic diff when server re-seeds the prop.

| Mutation | Optimistic | On error (rollback) | Verdict |
|---|---|---|---|
| Rename (`:853-876`) | swap `name` | restore `previous` literal | correct |
| Duplicate (`:891-912`) | none (waits for server id) | status error only | correct (nothing to roll back) |
| Move to category (`:914-941`) | swap `category` + invalidate | restore `previous` | correct |
| Rename category (`:969-996`) | rewrite `category` on matches + `selectedCategory` | restore list + selectedCategory | correct |
| Delete (`:1011-1036`) | none (guarded by `deletePending`) | status error only | correct |
| Create (`:845-851`) | append + select | handled in `NewTemplateModal` | OK |

**Rollback gaps:**
- **(G1) Stale-closure over `previous`** (`:856, 918`): two concurrent optimistic
  edits to the *same* template can collide — the second's `previous` already
  reflects the first's patch. Low-likelihood (rows usually edited sequentially)
  but no sequencing guard.
- **(G3) Duplicate/delete patch the cache but don't invalidate** — intentional
  (avoids refetch) but if a separate tab mutated the workspace between action and
  patch, this user overwrites that change until 5-min `staleTime` expires. No
  last-write-wins guard (no version/etag).

**Missing:** no top-level empty state — a zero-template workspace renders an empty
`<ul>` (`TemplateGallery.tsx:421-437`).

## 3. Template editor

- **Sheet** (`TemplateEditorSheet.tsx`): editable branch nodes (inline rename on
  double-click `:380`, add-group/area, delete), per-area row tables
  (`TemplateEditableRow`, commit on blur). Drag/drop for library items (routed to
  a group's first area `:294`) and templates (targeting groups). Empty state
  well-handled (`:661-672`).
- **Structure tree** (`TemplateStructureTree.tsx`): context-menu CRUD + Move
  up/down (the non-drag reorder path `:219-242`) + drag reorder.
- **Right sidebar** (dynamic, `TemplateEditorClient.tsx:503-529`): read-only dock
  when `!canEditTemplate` (dead — `page.tsx:23` always passes truthy),
  `EstimateRightSidebar` once `dockRequested && libraryData`, else lazy fallback
  warmed on hover/focus/click.

### `use-template-editor` source vs value — RE-ANALYZED (not broken)

- **Render-phase setState (`:57-60`):** guarded prop-sync — fires only when
  parent's `template` prop reference changed (server refresh). React explicitly
  permits setState-during-render when conditional on a prop change and targeting
  the same component. **Not a bug.** Correctly re-seeds `value` from canonical
  server tree on refresh.
- **`run()` race (`:90-119`):** the rollback captures `previous` **inside the
  `setTemplateState` updater** (`:97-101`) — the canonical React-18-safe pattern
  for reading pre-mutation state under batching; updaters run in queue order, so
  it cannot be stale relative to other queued updates. The `try`/`catch` triggers
  `refreshNow()`/`scheduleRefresh()` (450ms deferred for row edits `:184`) on
  success, or restores `rollback` (`:110-112`) on failure. **The rollback is NOT
  broken.** StrictMode double-invocation is harmless (updater is idempotent w.r.t.
  `previous`). **This downgrades the first-pass BUG-P2-01.**

**Editor caveats:**
- **(G5) `moveNode` skips the local transform** (`:162-168`, `run(null, …)`) —
  the tree visibly freezes in old order until `router.refresh()` lands. Drag-
  reorder feels laggy vs. other mutations.
- **(G6) `insertTemplate` also passes `null` optimistic** (`:250-256`) — no local
  preview of inserted subtree.
- **(G7) `addLibraryItems` optimistic rows use temp ids** (`:230-248`) that the
  server replaces; `TemplateEditableRow` correctly disables editing on temp rows.

## 4. Insert into estimate — the stale-link integrity gap (BUG-TM-01)

Flow (`InsertIntoEstimatePicker.tsx`):
1. `listEstimateInsertTargets()` (`:182`) → projects with nested estimates.
2. Project+estimate selected → `resolveEstimateTemplateInsertTarget` (`:226-230`)
   → first root group (`actions.ts:2818-2830`); if none, "This estimate has no
   group to insert under" (`:240`).
3. Submit re-resolves target (defensive `:293-309`) →
   `insertEstimateTemplateIntoEstimate` (`estimates/actions.ts:3149-3181`) →
   `insert_estimate_template_into_estimate_with_history` RPC **in a single D1
   transaction**. Authz: `assertCanEditEstimate` `:3164`.

`getTemplateDependencyHealth` gating (`source-trust-model.ts:463-588`):
- **Blocked (hard stop):** `archivedCount` (rows with `row.lifecycleState ===
  "archived"`, `:471-481`).
- **Warnings (override-able):** discontinued, draft/in_production, source-changed,
  detached, very-stale (>180d), stale (>90d), missing pricing date, low confidence.

### BUG-TM-01 [P1] — Stale-link blindness in dependency health

**The dependency health check operates on snapshot data, not live library
state.** Verified at `repository.ts:988`:
- `lifecycleState` reads `sourceSnapshot.lifecycleState` — the JSON captured when
  the row was added — **not** a live join to `cost_library_items.lifecycle_state`.
- `row.link_state` is **never copied onto the output object** (absent from the
  returned shape at `:952-995`). So `rowLinkState` (`source-trust-model.ts:397-400`)
  falls back to `row.sourceLibraryItemId ? "linked-clean" : "unlinked"` — meaning
  **"detached" and "source-changed" dependency warnings can essentially never
  fire** for template rows, no matter what the DB column says.
- The only `link_state` write sites in `template-editor-actions.ts` always stamp
  `"linked-clean"` (`:662`) or `"unlinked"` (`:777`) — so the column never even
  holds "source-changed" for template rows.
- `pricingDate` falls back to `row.created_at.slice(0,10)` (`:993`) — so the
  "missing price date" warning is masked for snapshot-less rows.

**Net effect:** when a referenced library component is archived, deleted, or its
price source changes *after* the template row was created, the insert picker will
almost always report the template as `healthy` and allow insert with no override.
The "archived dependency" hard-block (`:471-481`) is effectively unreachable
through the browse→insert path. **No broken-link UX exists for this case.** No
live re-validation between `getTemplateDependencyHealth` (client-side, snapshot-
derived) and the insert RPC. The RPC is the only place that could catch a
dangling `source_library_item_id`.

The browse gallery + editor sheet show `SourceTrustChips` from the same
snapshot-derived data, so chips are equally stale-blind. (`getCostLibraryComponent
Usage` correctly joins `source_library_item_id` to count usage in the *component*
inspector — but nothing flows that back to mark the template row.)

## 5. Template-into-template (`insertTemplateIntoTemplate`, `:924-1045`)

- Loads source nodes + rows (`:944-967`); optional subtree BFS (`:971-990`);
  fresh UUIDs for every copied node (`idMap`) and row; parent links remapped;
  top-level copies land under `targetNodeId`.
- **Cross-workspace guard: correct** — both source and target verified against
  the same `workspace.id` via `requireWorkspaceTemplate` called twice (`:934-935`);
  `workspace` from `ensureDefaultWorkspace()`. Self-insert rejected (`:936-938`);
  non-group target rejected (`:940-941`).
- **Compensating delete on failure — partial.** Nodes inserted first (`:1009`);
  row inserts wrapped in try/catch that deletes just-inserted nodes on row-insert
  failure (`:1029-1038`). **BUG-TM-02 [P2]:** if the *node-insert* `runBatch`
  itself fails partway (D1 batch falls back to serial loop when `database.batch`
  absent, `:250-256`), some nodes commit with no rollback. No transaction wraps
  node+row insert together. (Compare `insert_estimate_template_node_into_estimate
  _with_history`, which IS transactional on the RPC side — template-into-template
  does not use that RPC.)
- **BUG-TM-03 [P3]:** copies rows verbatim including `source_library_item_id`
  (`:1014-1023`) with no staleness/archival re-check at copy time. A template
  containing archived-component rows gets duplicated silently.

## 6. Server actions authz — complete

Every exported action in `template-editor-actions.ts` runs
`requireTemplateEditorAccess` (→ `isWorkspaceEditorInD1`) +
`requireWorkspaceTemplate` (workspace-scoped lookup). Confirmed on all 10 actions
(`createEstimateTemplateNode`, `rename/delete/moveEstimateTemplateNode`,
`addEstimateTemplateRowItems`, `createEstimateTemplateAllowanceRow`,
`update/remove/reorderEstimateTemplateRowItems`, `insertTemplateIntoTemplate`).
Node ops re-verify node belongs to template via `requireTemplateNode`.
`insertTemplateIntoTemplate` verifies **both** target and source templates belong
to the workspace (`:934-935`). Browse mutations use the equivalent
`assertCanManageLibrary` (`actions.ts:2519, 2541, 2566, 2599, 2682, 2716`).

**Maintainability note (G11):** two parallel authz code paths
(`requireTemplateEditorAccess` vs `assertCanManageLibrary`) for the same domain —
an auditor must verify both stay in sync.

## 7. Bugs specific to templates

| ID | Sev | Summary | Location |
|---|---|---|---|
| **BUG-TM-01** | **P1** | Stale-link blindness: dependency health uses snapshot lifecycle, never surfaces `row.link_state`; archived-component hard-block unreachable; detached/source-changed warnings never fire | `repository.ts:988, 952-995`; `source-trust-model.ts:463-588` |
| BUG-TM-02 | P2 | `insertTemplateIntoTemplate` non-atomic across node+row insert; compensating delete only covers row-insert failure | `template-editor-actions.ts:1009, 1027-1038` |
| BUG-TM-03 | P3 | Template-into-template copies `source_library_item_id` verbatim with no archival re-check | `:1014-1023` |
| BUG-TM-04 | P3 | `reorderEstimateTemplateRowItems` exported but unused (no client caller; editor reorders nodes via drag) | `:889-917` |
| BUG-TM-05 | P3 | Browse top-level empty state missing (zero templates = blank `<ul>`) | `TemplateGallery.tsx:421-437` |
| BUG-TM-06 | P3 | Optimistic rollback can clobber concurrent edits to the same template (stale `previous`) | `TemplatesBrowseManager.tsx:856, 918` |
| — | P3 | `moveNode`/`insertTemplate` skip optimistic local transform → drag-reorder/insert feels laggy | `use-template-editor.ts:162-168, 250-256` |
| — | P3 | Read-only editor branch dead (`canEditTemplate` always truthy at only call site) | `TemplateEditorClient.tsx:503-529`; `page.tsx:23` |
| — | dead | `TemplatePreviewDock.tsx` component never imported (model `TemplatePreviewDockModel.ts` IS live via `TemplateGallery.tsx:24`) | `templates-browse/TemplatePreviewDock.tsx` |

### `run()` rollback — final verdict
**Not broken.** The `previous` capture inside the `setTemplateState` updater is
the canonical React-18-safe pattern; the render-phase setState is a guarded
prop-sync React permits. **This downgrades the first-pass BUG-P2-01 to a non-bug
(noted as a defensive-pattern observation only).**

## Key file references
- Browse: `src/components/workshop/library/templates-browse/{TemplatesBrowsePageClient,TemplatesBrowseManager,TemplateGallery,InsertIntoEstimatePicker,TemplatePreviewDock,TemplatePreviewDockModel}.tsx/.ts`
- Editor: `src/components/workshop/library/template-editor/{TemplateEditorClient,TemplateEditorSheet,TemplateStructureTree,use-template-editor}.tsx/.ts`
- Server actions: `src/lib/component-library/template-editor-actions.ts`; browse mutations in `src/lib/component-library/actions.ts:2512-2724`
- Repository: `src/lib/repositories/component-library-repository.ts` (seed/load 1291-1393; row normalize 934-996)
- Insert RPC: `src/lib/estimates/actions.ts:3149-3181`
- Dependency health: `src/components/workshop/library/source-trust-model.ts:463-588`
