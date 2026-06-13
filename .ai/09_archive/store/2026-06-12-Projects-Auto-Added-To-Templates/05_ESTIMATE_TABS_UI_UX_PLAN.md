# 05 — Estimate Tabs UI/UX Plan

**Date:** 2026-06-12 · Grounding: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) §3, §9, §16; architecture: [02_TARGET_ARCHITECTURE.md](02_TARGET_ARCHITECTURE.md) §4, §13.

---

## 1. Where tabs appear

**Decision: a horizontal estimate-tab strip at the top of the sheet center column**, rendered inside `EstimateSheetContent` directly above the existing "Sheet controls" `TreePanelHeader` row (`src/components/workshop/EstimateSheetContent.tsx:459-491`), spanning the center column (`id="estimate-sheet-center-column"`, `:1607`).

Why here and not alternatives considered:
- The left tree panel's header is already a tab strip with one hardcoded entry (`ESTIMATE_TREE_TABS = [{id:"sheets", label:"Sheets"}]`, `EstimateSheetTree.tsx:63`, wired at `:1303-1305`) — but that strip switches *panel views*, is width-constrained by the resizable panel, and a long tab list would fight the tree search/toolbar. It stays a single-entry strip relabeled "Tabs".
- An Excel-style bottom strip was rejected: the bottom edge hosts the floating Ask Flip button (`WorkshopPageShell` mount) and totals; the repo's existing in-app precedents are top tab strips (`LibraryTabsLayoutClient.tsx:10-29`, `SharePageTabs.tsx:245`, `ProjectPublicationHeader.tsx:401`).
- Component to reuse: the same tab-strip primitive family used by `TreePanelHeader`'s `tabs` prop and `src/stories/navigation/tab-strip.stories.tsx` — extend, don't invent (see §9 ownership).

## 2. How the existing sheet/tree panel changes

- `EstimateSheetTree` receives `activeTabId` and renders only that tab's tree (data: `tabTree` query, [04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §2). Its panel tab label flips "Sheets"→"Tabs"; id `"sheets"` stays (state value, not copy — 01 §16C).
- `EstimateSheetContent` mounts the new `EstimateTabStrip` (new component, see §9) and keys its tree/rows rendering by `activeTabId`. The expansion context (`EstimateSheetExpansionContext`, `EstimateSheetContent.tsx:63`) and `collapsedNodeIds` become per-tab via the re-keyed store ([04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §11).
- Perf guard: the strip must mount **outside** the memoized row tables so tab UI state changes don't re-render rows — the zero-re-render perf suites will catch violations (`tests/vitest/perf/estimate-sheet-render-relief.test.tsx`; 09 §8).

## 3. Tab lifecycle interactions

| Action | Surface | Flow |
|---|---|---|
| Create | "+" button at strip end + strip context menu | optimistic append ("Tab N" default name, inline-rename armed) → `createEstimateTab` ([04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §3); new tab opens empty-state (§5) |
| Rename | double-click tab label; context menu "Rename tab"; F2 | inline input, Enter/blur commit, Esc cancel — exact contract of node inline-rename (`EstimateSheetTree.tsx:256-267` editing state + `tests/vitest/estimate-tree-context-menu.test.tsx` behaviors) |
| Duplicate | context menu "Duplicate tab" | `duplicateEstimateTab`; lands as sibling `sort_order+`, name "{name} copy" with dedupe counter (mirrors `duplicateEstimateSheet` naming, `actions.ts:1383-1497`) |
| Reorder | drag tab along strip; context menu "Move left/right" (keyboard path §8) | optimistic order patch → `reorderEstimateTabs` |
| Archive | context menu "Archive tab" | hides from strip (default filter `archived_at is null`); "Show archived" affordance in strip overflow menu restores |
| Delete | context menu "Delete tab" → confirm dialog | warning lists node/row counts (pattern: node delete descendant warning, `estimate-tree-context-menu` suite); **last unarchived tab cannot be deleted** (action + RPC refuse); deleting the default re-points `is_default` (03 §8) |

All tab mutations write `tab_*` events (04 §7).

## 4. Selected node when switching tabs

Per-tab selection memory: `selectedNodeIdByTabId` ([04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §11). Switching to a tab restores its last selected node, else its first area (`selectFirstEstimateNodeIds` per-tab extension). The URL follows selection through the existing `history.replaceState` mechanism (`EstimateSheetTree.tsx:468-479`) — switching tabs therefore updates the URL to a node in the new tab with **no route reload** (the dnd e2e already asserts no-reload semantics; 09 §6). Pending row edits in the previous tab follow §7 (dirty state).

## 5. Empty tab state

New tabs have no nodes. Empty state in the center column (copy table §10): title "This tab is empty", body "Add a group to start the tree, or drag a template or project content here.", primary action "Add Group" (existing toolbar action, `tests/vitest/estimate-tree-modal.test.tsx` contract), secondary "Browse templates" (opens right sidebar Templates tab). The whole empty surface is a `TemplateDropZone`-style target (`src/components/workshop/estimate-sheet/rows/drop-zones.tsx:130-171`). Root inserts into an empty tab pass the explicit `estimateTabId` ([04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §3).

## 6. Drag/drop inside a tab; cross-tab behavior

- **Inside a tab:** unchanged — tree node drags (`ESTIMATE_TREE_DRAG_ITEM_DATA_TYPE`, `EstimateSheetTree.tsx:62`), template/library payloads onto drop zones, same validation chain (`canNestEstimateNodeKind` + DB triggers).
- **Cross-tab: not supported in v1.** Dropping a node payload onto another tab's strip button is rejected with a toast ("Moving between tabs isn't supported yet — duplicate the tab or save the group as a template."). Rationale: cross-tab moves need a new tab-aware reorder/move RPC with cross-tab simulation (03 §4.5) and ambiguous sort semantics; deferred to follow-up (recorded in [12_OPEN_QUESTIONS_AND_DECISIONS.md](12_OPEN_QUESTIONS_AND_DECISIONS.md) D-7). The workaround paths (duplicate tab; save-as-template then insert) exist day one.
- Dragging a **template/project source onto a tab strip button** switches to that tab after 600 ms hover (spring-loaded tabs), then normal drop targeting applies — same affordance family as folder auto-expand on hover (`tests/vitest/tree-external-drop.test.tsx` auto-expand precedent).

## 7. Interaction states

- **Dirty edits:** save-state machine (`"idle"|"dirty"|"saving"|"saved"|"failed"`, `use-estimate-row-mutations.ts:11, 103-123`) is global per workspace today; keep it global but block tab *deletion/archive* while `saving`, and flush per-row queues (`rowUpdateQueuesRef`, `:291-301`) before switching renders — switching tabs never cancels in-flight mutations (they key by row/estimate ids, not view state).
- **Collaboration presence:** cursor layer broadcasts gain `tabId` in payload; remote cursors render only when `remote.tabId === activeTabId` (prevents ghost cursors — 01 §11). Presence payload optionally gains `activeTabId` (additive, `use-project-presence.ts:11-20`).
- **Pending row mutations:** per-row save pills unchanged; rows in non-active tabs keep mutating in cache (mutations target `tabTree(estimateId, tabId)` keys regardless of view).
- **Active drag:** strip buttons show drop-hover affordance during template/source drags (mime sniff on `dragover` types, as `TemplateDropZone` does).
- **Failed tab load:** per-tab error state with retry, reusing the lazy-library error/retry pattern (`EstimateSheetContent.tsx:1741` fallback family); the strip stays interactive so users can switch to a healthy tab.

## 8. Keyboard & accessibility (every drag action has a non-drag path)

- Strip is a WAI-ARIA `tablist` (precedent with correct semantics: `SharePageTabs.tsx:245`); arrow keys move focus, Enter/Space activates, Home/End jump. `aria-label="Estimate tabs"`.
- Reorder without drag: context menu "Move left/right" + `Cmd/Ctrl+Shift+←/→` on a focused tab.
- Insertion without drag (parity rule): templates/sources insert via context-menu "Add to estimate" and the bulk "Add selected" flow that already exist (`TemplatesTree.tsx:353-501`; `getCheckedTemplateUnits` bulk path `component-library/index.tsx:920-935`; browse-route `InsertIntoEstimatePicker`); project-derived sources get the same menu actions (06 §9). Keyboard move of templates between categories already has a precedent to mirror (`template-gallery.test.tsx` keyboard move scenario).
- Focus management: deleting/archiving the active tab moves focus + activation to the nearest remaining tab (mirror node-delete fallback chain, `src/lib/estimates/estimate-tree-edit.ts:54-77`).
- Live region announces tab switches and tab CRUD results (aria-live status strip precedent: `TemplateGallery.tsx:253-264`).

## 9. Component ownership — reuse vs extend

| Piece | Decision |
|---|---|
| `EstimateTabStrip` (new) | new component in `src/components/workshop/estimate-sheet/`, composed from the existing tab-strip primitive used by `TreePanelHeader`'s `tabs` prop (`src/components/ui/tree-panel-header.tsx`) / `tab-strip` story family — extend the primitive with overflow scrolling + context-menu slots rather than forking |
| Context menus | existing Radix context-menu wrapper used by tree/templates (`TemplatesTree.tsx:353-501` pattern) |
| Inline rename | reuse the tree's editing-state contract (`EstimateSheetTree.tsx:256-267`) |
| Confirm dialogs | existing confirm/delete dialog primitives (`src/components/ui/overlays/*`, Storybook-proven) |
| Drop zones | `TemplateDropZone` family (`estimate-sheet/rows/drop-zones.tsx`) |
| Empty state | existing empty-state composition used by `ProjectEstimatesClient.tsx:97-111` |

## 10. UX copy table (old → new)

Authoritative rebrand list; bucket A anchors in 01 §16. "Estimate sheet" (meaning the estimate) collapses to **"Estimate"**; tree containers are **"Tabs"**; Excel worksheets are **"worksheet tabs"**.

| Old label/copy (cite) | New label/copy |
|---|---|
| "Create Estimate Sheet" / "Creating estimate sheet" (`ProjectEstimatesClient.tsx:75`) | "Create Estimate" / "Creating estimate" |
| "No estimate sheets yet" / "No matching estimate sheets" (`ProjectEstimatesClient.tsx:37,97`; `ProjectEstimatesTable.tsx:620`) | "No estimates yet" / "No matching estimates" |
| "Search Estimate Sheets" (`ProjectEstimatesClient.tsx:61-62`) | "Search Estimates" |
| Column "Estimate Sheet Name" / label "Estimate sheet name" (`ProjectEstimatesTable.tsx:789,799`; `ProjectEstimateMetadataStrip.tsx:195,208`; `actions.ts:1626`) | "Estimate Name" / "Estimate name" |
| Column/label "Sheet Code" / "Sheet code" (`ProjectEstimatesTable.tsx:545,781`; `NewEstimateForm.tsx:30`; `actions.ts:1631`; activity labels `activity-history.tsx:59,190`) | "Estimate Code" / "Estimate code" (audited meaning: identifies the estimate, not a tab — 01 §16 Task 3) |
| Typed phrase `DELETE SHEET` / `DELETE n SHEETS` (`ProjectEstimatesTable.tsx:684` + server tokens `mass-deletion/bulk-action.ts:76,82`) | `DELETE ESTIMATE` / `DELETE n ESTIMATES` — **client+server atomic flip** |
| "Delete estimate sheet(s)" modal/menu copy (`ProjectEstimatesTable.tsx:230,685,910-986`) | "Delete estimate(s)"; helper "Deleting estimates removes their tabs, tree nodes, row items, and activity…" |
| Tree panel tab "Sheets" (`EstimateSheetTree.tsx:63`) | "Tabs" |
| "Sheet controls" / "Sheet tools" / "Sheet search" / "Search Sheet" (`EstimateSheetContent.tsx:459-470`) | "Tab controls" / "Tab tools" / "Tab search" / "Search Tab" (scoped to active tab) |
| "Main estimate sheet" aria (`EstimateSheetContent.tsx:1610`) | "Estimate tab content" |
| `No sheet rows match "{q}"` (`EstimateSheetContent.tsx:1657`) | `No rows in this tab match "{q}"` |
| "Loading estimate sheet" (`EstimateWorkspaceClient.tsx:98,109`) | "Loading estimate" |
| "Rename estimate sheet…" (`ProjectEstimateMetadataStrip.tsx:209`) | "Rename estimate…" |
| Activity: "Sheets" tab, "No sheet activity yet", "Estimate sheet activity", "Sheet root", "Audit trail · …" fallback "Estimate sheet" (`activity-history.tsx:63,243,426,1313-1314,1552-1583`) | "Tabs" scope level added; "Estimate" / "Tab" labels; "No activity yet in this estimate" |
| "updated estimate sheet details." (`activity-composer.ts:90`) | "updated estimate details." |
| Collaboration: "Estimate sheet access", "Sheets inherit project roles…", "Only sheet owners and admins…", "Sheet invite email sent.", "Sheet now inherits…" (`ProjectTeamspaceHeader.tsx:353-666`; `collaboration/actions.ts:196-1031`) | "Estimate access", "Estimates inherit project roles…", "Only estimate owners and admins…", "Estimate invite email sent.", "Estimate now inherits…" |
| "Open sheet" / "Sheet-only" / "shared sheets" (`LiveProjectCard.tsx:70-296`; `app/workshop/page.tsx:42`; invite `accept/route.ts:65`; pending-invite actions) | "Open estimate" / "Estimate-only" / "shared estimates" |
| Invite scope "Estimate sheet: {name}" (`app/invite/[token]/page.tsx:152`) | "Estimate: {name}" |
| Publication: "Estimate sheets to include", "Sheets" tab, "No estimate sheets in this project." (`ProjectPublicationHeader.tsx:401-694`) | "Estimates to include", "Estimates" tab, "No estimates in this project." |
| Share page: tablist "Estimate sheets", tab "Sheets", OG "`n` estimate sheets • …" (`SharePageTabs.tsx:245`; `ShareEstimateTreePanel.tsx:402`; `share/[token]/page.tsx:252`) | "Estimates"; "Estimates"; "`n` estimates • …" |
| Default record name `` `${sheetCode} Estimate Sheet` `` (`actions.ts:1374`) | `` `${sheetCode} Estimate` `` — **existing rows keep their stored names** (no data rewrite; noted in [12](12_OPEN_QUESTIONS_AND_DECISIONS.md) D-9) |
| Save-as-template menu "Save as template" (sheets tree context, `templates.ts:39-46`) | unchanged wording; description copy says "Save this group/area as a template" — plus new tab-level "Save tab as template" (06 §9) |
| Picker "Estimate sheet" / "No estimate sheets in this project yet." (`InsertIntoEstimatePicker.tsx:171,184`) | "Estimate" / "No estimates in this project yet." |
| "Template sheet" aria family (`TemplateEditorSheet.tsx:558-565`; `TemplateGallery.tsx:215-221`) | "Template content" family (e2e label assertions update together — 09 §10) |
| "Component sheet" aria family (`ComponentLibraryManager.tsx:874-880`) | "Component table" family (same e2e coupling) |
| Backfilled default tab name (03 §7) | `Main` — shown as the single tab on every existing estimate |
| Marketing/landing "sheet" nouns (`app/features/page.tsx`, `app/pricing/page.tsx:11`, `FeaturesSection.tsx` etc.) | Phase 4 delegated owner review completed 2026-06-13: public product/workspace surfaces say "estimates" and "tabs"; "Excel quote sheets"/"spreadsheet" references stay only when they mean external files — see [12](12_OPEN_QUESTIONS_AND_DECISIONS.md) Q-1 and R2.4 evidence log |

Do-not-touch vocabulary: ExcelJS/worksheet code, `Sheet` overlay primitive, "sheet vinyl"/"Sheet Membranes"/unit "sheet", "spreadsheet" (01 §16E).

## 11. Route strategy

Keep `/workshop/projects/[projectId]/estimates/[nodeId]` (02 §13): tab derives from the resolved node; estimate-id URLs land on the default tab; old links never redirect. No `/tabs/[tabId]` route in v1. Breadcrumb/header: the metadata strip (`ProjectEstimateMetadataStrip`) continues to show estimate name + estimate code; the active tab name appears in the strip and the activity eyebrow ("Estimate · Tab") replacing the "Sheet" eyebrow (`EstimateSheetContent.tsx:391`).

## 12. Mobile/responsive, loading, error

- **Responsive:** strip scrolls horizontally with overflow fade + overflow menu listing all tabs (pattern: share page mobile swipe-able tabs, `shared-link-receiver.spec.ts` mobile coverage). At ≤768px the left tree panel keeps its inherited collapse behavior (unification known-gap, `.ai/10_state/current-state.md:57-59`) — tabs must not regress that.
- **Loading/skeleton:** tab strip renders from `tabs` query with `initialData` from the route loader (no flash); switching tabs shows the existing tree skeleton while `tabTree` loads; `EstimateWorkspaceClient` dynamic-import fallbacks stay (`EstimateWorkspaceClient.tsx:14-26, 98-109`).
- **Errors:** per-tab load error (§7); tab CRUD failures roll back optimistic state + toast via the established `ToastProvider` path.

## 13. Design-system compliance

All new strip/menu/empty-state UI is subject to `scripts/enforce-app-design-system.mjs` (09 §7): SF Pro, explicit `text-[10px]`–`text-[12px]` sizes (12px max), regular/medium weights only, `rounded-xs` (3px) radius, zero tracking, neutral palette tokens from `DESIGN.md`, Phosphor icons in regular weight only (no bold/duotone/fill). Active-tab affordance uses the neutral ink/hairline tokens (no new accent — consistent with the D6 "no tint" decision, `.ai/10_state/decisions.md` 2026-06-11).

## 14. Browser/manual QA scenarios (desktop + mobile widths)

1. Open an existing (single-tab) estimate → strip shows "Main" + "+"; tree/rows byte-identical behavior; URL unchanged.
2. Create → rename → reorder → duplicate → archive → delete tabs; verify activity events and strip focus management at each step.
3. Switch tabs with unsaved row edit in flight → edit persists; save pill resolves; no cross-tab bleed.
4. Drag a custom template onto tab B's strip button → spring-load switches → drop on group → inserted in tab B only.
5. Keyboard-only: create tab, rename (F2), move (Cmd+Shift+→), insert template via context menu, delete with confirm — no pointer.
6. Two browsers, same estimate, different tabs → cursors do not ghost across tabs; presence dots stable.
7. Old estimate-id URL and old node-id URL both land correctly (default tab / node's tab).
8. 375px width: strip scrolls, overflow menu lists tabs, tree panel collapse behavior unchanged.
9. Export preview from a multi-tab estimate reflects the chosen scope (07 §6 preview parity).
10. Empty new tab: empty-state actions work; drop on empty surface creates root group + content.

## Evidence Used

- `src/components/workshop/EstimateSheetContent.tsx` (center column, controls row, drop zones, cursor layer, error fallback)
- `src/components/workshop/EstimateSheetTree.tsx` (tab-strip wiring :63/:1303-1305, URL sync :468-479, inline-edit state :256-267)
- `src/components/ui/tree-panel-header.tsx`; `src/stories/navigation/tab-strip.stories.tsx` (primitive to extend)
- `src/components/share/SharePageTabs.tsx:245` (tablist semantics + mobile precedent); `LibraryTabsLayoutClient.tsx:10-29`
- `src/hooks/use-estimate-row-mutations.ts` (save-state machine, row queues); `src/hooks/use-estimate-workspace-state.ts`
- `src/lib/estimates/estimate-tree-edit.ts:54-77` (focus fallback chain); `src/lib/estimates/actions.ts:1383-1497` (duplicate naming)
- `scripts/enforce-app-design-system.mjs`; `DESIGN.md` (app typography/radius/palette rules)
- 01 §16 terminology sweep (every copy citation in §10)
- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`; `tests/vitest/tree-external-drop.test.tsx`; `e2e/shared-link-receiver.spec.ts` (constraints the UI must not break)
