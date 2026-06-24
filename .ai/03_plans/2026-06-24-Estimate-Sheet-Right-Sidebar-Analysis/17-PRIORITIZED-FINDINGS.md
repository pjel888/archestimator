# 17 — Prioritized Findings

> Severity: **P0** = data loss / cross-workspace exposure / security breach. **P1** = major persistence deception / workflow failure / race condition. **P2** = noticeable inconsistency / incomplete workflow. **P3** = minor polish.

---

## F-01: `onLibraryDataChanged()` called after local-only Delete creates a false invalidation signal

| Field | Value |
| --- | --- |
| Severity | **P1** |
| Confidence | High |
| Classification | MISLEADING UX · LOCAL-ONLY BEHAVIOR |
| Entity | Library Component (Delete single + bulk) |
| User journey | Delete component → see toast "removed from this sidebar view" → remount/refresh → item reappears |
| User impact | User believes they deleted a component. It returns on refresh. Potential for confusion and duplicated work. |
| Technical impact | `onLibraryDataChanged?.()` invalidates the React Query lite key, triggering a background refetch. But the sidebar's `libraryItems` is seeded once from `initialLibraryItems` and evolves locally — it never re-reads from the cache. So the refetch is wasted network, and the item stays hidden until remount reveals it again. |
| Evidence | `index.tsx` — delete handlers call `setLibraryItems(prev => prev.filter(...))` then `onLibraryDataChanged?.()`. The `createComponent` helper (`helpers.ts:220`) creates local-only items with `id: custom-${Date.now()}`. The test at `estimate-sheet-library-lazy-load.test.tsx:197` counts `onLibraryDataChanged` call sites (≥8) but does not distinguish persisted from local mutations. |
| Root cause | The sidebar was designed for optimistic local mutations with server persistence, but Delete/Edit/Duplicate were never wired to server actions — only the AddComponentModal create flow was. |
| Recommended correction | Either: (A) wire Delete to `executeBulkArchiveLibraryComponents` (the RPC already exists for bulk archive), with the toast honestly saying "archived"; or (B) relabel the sidebar Delete as "Hide from this view" and stop calling `onLibraryDataChanged()` for local-only hides. Option A is the honest CRUD path; Option B is the honest local-only path. |
| Regression risk | Low — server action `executeBulkArchiveLibraryComponents` already exists with preview+execute + hash verification. The sidebar just needs to call it. |
| Required tests | Integration: delete component → refresh → item is archived (not visible). Bulk delete with partial failure. Undo after server-confirmed archive. |
| Complexity | M |

---

## F-02: "Project" tab (projection) vs "Reusable Project Sources" (in Templates) terminology confusion

| Field | Value |
| --- | --- |
| Severity | **P2** |
| Confidence | High |
| Classification | MISLEADING UX |
| Entity | Top-level tabs + Templates tree |
| User impact | User does not understand why "Project" appears in two places with different data. The Project tab shows current-project components; the Templates > Projects section shows other projects' estimate trees. |
| Evidence | `index.tsx:149-157` — tab `id:"project"` label "Project". `TemplatesTreeModel.ts:449-483` — Templates tree builds a "Projects" section from `ReusableEstimateSource[]`. Both use the word "project" for different concepts. |
| Recommended correction | Rename the Project tab to "Project Components" (or "This Project") to distinguish from the reusable project sources browser. No DB/code change needed — only the label string in `LIBRARY_TREE_TABS`. |
| Complexity | S |

---

## F-03: `createComponent()` helper builds local-only items with timestamp IDs

| Field | Value |
| --- | --- |
| Severity | **P1** |
| Confidence | High |
| Classification | LOCAL-ONLY BEHAVIOR · DATA-INTEGRITY RISK |
| Entity | Library Component (legacy create, edit, duplicate) |
| Evidence | `helpers.ts:220-294` — `id: custom-${Date.now()}`. No server call. No DB insert. |
| User impact | User edits/duplicates a component, sees the change, refreshes — change is lost. The canonical `AddComponentModal` persists correctly but the legacy `NewComponentForm` and the preview-panel Edit/Duplicate buttons use the non-persisted helper. |
| Recommended correction | Remove the `NewComponentForm` path entirely (the `AddComponentModal` is already the canonical create surface). Wire Edit to open the `AddComponentModal` in edit mode. Wire Duplicate to call `createCostLibraryComponent` with the duplicated fields. |
| Regression risk | Medium — the legacy form has test coverage; tests need updating. |
| Complexity | M |

---

## F-04: Project-source search has no request-cancellation (stale response risk)

| Field | Value |
| --- | --- |
| Severity | **P1** |
| Confidence | Medium (code-path inferred; not runtime-verified) |
| Classification | HIGH-RISK IMPLEMENTATION · RACE CONDITION |
| Entity | Reusable Project Sources (server search) |
| User impact | A slow earlier search response can arrive after a newer search and merge stale sources into the current result tree. |
| Evidence | `index.tsx` — `searchReusableProjectSources` is called in an effect; the results land in `projectSourceSearchResults`. There is no `AbortController`, no request-identity guard, and no "latest query wins" check in the merge functions (`mergeReusableSourcesByKey` at line 868 overwrites by key unconditionally). Background agent `bg_b09df498` is verifying the exact line numbers. |
| Recommended correction | Stamp each search request with a monotonically increasing id; on response, check if it's still the latest before writing to state. Alternatively, use `AbortController` to cancel the previous fetch. |
| Complexity | S |

---

## F-05: Component Edit and Duplicate are local-only mutations (see F-03)

*Duplicate of F-03 with focus on Edit/Duplicate specifically. Severity P1.*

---

## F-06: Component Delete is local-only (see F-01)

*Duplicate of F-01 with focus on the Delete path. Severity P1.*

---

## F-07: Favorites and Recents are device-local, not account-persisted

| Field | Value |
| --- | --- |
| Severity | **P2** |
| Confidence | High |
| Classification | LOCAL-ONLY BEHAVIOR |
| Evidence | `helpers.ts:667-668` — `LIBRARY_FAVORITES_KEY`, `LIBRARY_RECENTS_KEY` → `window.localStorage`. Not synced to Supabase. |
| User impact | Favorites/recents set on one device do not appear on another. No multi-device sync. |
| Recommended correction | For a pre-first-users product, device-local is acceptable. If multi-device is a goal, add a `user_preferences` table or use Supabase Realtime. Low priority until user feedback warrants it. |
| Complexity | L (if pursued) |

---

## F-08: Custom tree ordering is browser-local

| Field | Value |
| --- | --- |
| Severity | **P2** |
| Confidence | High |
| Classification | LOCAL-ONLY BEHAVIOR |
| Evidence | `helpers.ts:669` — `LIBRARY_TREE_ORDER_KEY` → `localStorage`. `index.tsx` `customOrderByViewMode` state seeds from this. |
| User impact | Reordered folders/components on one device don't persist to another. The DB has `sort_order` on `library_folders` (persisted via `reorderLibraryFolders`) but the sidebar's component-level reorder (drag siblings within a view) is local-only. |
| Recommended correction | Acceptable for now. Document as intended behavior. |
| Complexity | N/A |

---

## F-09: Folder delete, reparent, and nesting are absent in the sidebar

| Field | Value |
| --- | --- |
| Severity | **P2** |
| Confidence | High |
| Classification | MISSING FUNCTIONALITY |
| Evidence | `LibraryTree.tsx` context menu (`createFolderActionGroups`, line 37-95) offers: New Component, Select, Rename, Collapse/Expand. No Delete, no reparent, no "move to folder". The full `LibraryFolderTree` (component-library-manager) does offer Delete + drag-reparent, but the sidebar uses the simpler `LibraryTree`. |
| User impact | User can create and rename folders in the sidebar but must go to the Library page to delete or restructure them. |
| Recommended correction | Either add Delete to the sidebar context menu (calling `deleteLibraryFolder`), or surface a "Manage in Library" link that deep-links to the full folder tree. |
| Complexity | S (add Delete) / S (add link) |

---

## F-10: Template Groups (categories) are local-only state

| Field | Value |
| --- | --- |
| Severity | **P1** |
| Confidence | High |
| Classification | LOCAL-ONLY BEHAVIOR · MISLEADING UX |
| Entity | Templates tab — custom template groups |
| Evidence | `index.tsx` state field `customTemplateGroups: string[]`. The "New Template Group" flow appends to this local array. No server action persists a group. On refresh, categories are derived purely from template `category` strings (`TemplatesTreeModel.ts:226-235`). An empty group (category string with no templates) vanishes. |
| User impact | User creates a group, sees it, refreshes — it disappears. The UI implies group is a persistent entity. |
| Recommended correction | Either: (A) remove the "New Template Group" affordance entirely (categories emerge from templates); or (B) persist categories as a separate `estimate_template_categories` table. Option A is simpler and matches the data model. |
| Complexity | S (remove affordance) / L (persist as table) |

---

## F-11: "Live source" / "Read-through source" chips are misleading

| Field | Value |
| --- | --- |
| Severity | **P1** |
| Confidence | High |
| Classification | MISLEADING UX |
| Entity | Project-source preview panel |
| Evidence | `index.tsx:517-523` — preview renders chips: `<span>Live source</span>` and `<span>Read-through source</span>`. But insertion calls `insert_estimate_subtree_into_estimate_with_history` which copies the subtree as a **snapshot** — there is no ongoing link, no live sync, no read-through. |
| User impact | User inserts a project source believing it will stay synchronized with the source project. It does not — changes to the source after insertion do not propagate. |
| Recommended correction | Replace the chips with accurate labels: "Snapshot copy" and "Source captured at [timestamp]". Or remove the chips entirely and state in the insert confirmation: "This inserts a copy of the selected source. Changes to the source will not propagate." |
| Complexity | S |

---

## F-12: Right sidebar hidden below 1024px breakpoint with no mobile entry point

| Field | Value |
| --- | --- |
| Severity | **P2** |
| Confidence | High |
| Classification | MISSING FUNCTIONALITY |
| Evidence | `ResizableSidePanel.tsx:74` — `const compactViewport = useMediaQuery("(max-width: 1023px)")`; line 77: `const responsiveWidth = compactViewport ? 0 : actualWidth`; line 234: `className="group hidden h-full shrink-0 overflow-hidden lg:flex"`. Below `lg` the panel is `display:none` with 0 width. |
| User impact | On tablet/mobile, the entire sidebar feature (Library, Project, Templates) is inaccessible. No alternative entry point exists. |
| Recommended correction | For a desktop-first estimating tool, this may be intentional. If mobile/tablet support is needed, add a collapsible drawer or sheet that opens on demand. Low priority. |
| Complexity | XL (if pursued) |

---

## F-13: Giant reducer component (EstimateRightSidebar ~2,000+ lines)

| Field | Value |
| --- | --- |
| Severity | **P2** |
| Confidence | High |
| Classification | MAINTAINABILITY RISK |
| Evidence | `index.tsx` — the `EstimateRightSidebarBase` component is flagged by react-doctor with a disable comment at line 934. The reducer at line 768 handles a single `fieldChanged` action type covering ~40 state fields. Every field update causes a full-state clone. |
| Recommended correction | Extract tab-specific state into separate hooks (useLibraryTabState, useProjectTabState, useTemplatesTabState). Extract modal/preview state into context. This is tracked in `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`. |
| Complexity | L |

---

## F-14: Folder-rename input focus restoration is fragile (context-menu close race)

| Field | Value |
| --- | --- |
| Severity | **P2** |
| Confidence | Medium |
| Classification | ACCESSIBILITY DEFECT · INCONSISTENT BEHAVIOR |
| Evidence | `LibraryTree.tsx:535-541` — `startFolderRenameFromContextMenu` sets `suppressNextContextMenuCloseAutoFocusRef.current = true` then `window.setTimeout(() => { onFolderRename(nodeId); }, 0)`. The Radix context menu's `onCloseAutoFocus` (line 683-687) checks this ref. This is a timeout-based race: if the Radix close fires before the timeout, focus is lost. |
| User impact | Context-menu rename sometimes fails to focus the input, requiring a second click. |
| Recommended correction | Use Radix `onCloseAutoFocus` with `event.preventDefault()` unconditionally during rename, then restore focus manually after the input mounts. The EstimateSheetTree has a more robust version of this pattern (lines 593-639). |
| Complexity | M |

---

## F-15: Reusable-source hover prefetch may issue duplicate requests on rapid hover

| Field | Value |
| --- | --- |
| Severity | **P3** |
| Confidence | Low (inferred from code, not profiled) |
| Classification | PERFORMANCE RISK |
| Evidence | `TemplatesTree.tsx:516` — `onMouseEnter={onPrefetchNode ? () => onPrefetchNode(treeNode.id) : undefined}`. The prefetch fires on every mouseenter with no dedup. If a user hovers back and forth over a project row, multiple prefetch requests could fire for the same project. |
| Recommended correction | Add a `Set<string>` of already-prefetched project ids; skip if already fetched. |
| Complexity | S |

---

## Summary

| Severity | Count | IDs |
| --- | --- | --- |
| P0 | 0 | — |
| P1 | 5 | F-01, F-03, F-04, F-10, F-11 |
| P2 | 7 | F-02, F-07, F-08, F-09, F-12, F-13, F-14 |
| P3 | 1 | F-15 |
| **Total** | **13** | |

## Highest-risk persistence inconsistency

**F-01 + F-03 + F-06 combined**: Component Edit, Duplicate, and Delete are all local-only mutations that look like persisted CRUD. This is the single most impactful honesty gap in the sidebar.

## Highest-risk race condition

**F-04**: Project-source search has no request cancellation. A slow earlier query can overwrite a newer query's results.

## Highest-risk accessibility issue

**F-14**: Folder-rename focus restoration depends on a `setTimeout(0)` race with Radix menu close.

## Highest-risk performance issue

**F-13**: The giant reducer component causes broad re-renders on every field update. Combined with `F-15` (hover prefetch), this can create cascading renders during rapid project-source browsing.
