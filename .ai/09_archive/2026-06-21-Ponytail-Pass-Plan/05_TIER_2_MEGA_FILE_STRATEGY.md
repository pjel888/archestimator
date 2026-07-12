# 05 — Tier 2 Mega-File Strategy

**Date:** 2026-06-21 · **Status:** VALIDATED (Agent B `bg_5317ab1f` complete — 2h10m exhaustive pass)

This document defines the per-file strategy for the 7 mega-files (>1500 LOC source files, excluding generated/skill-scripts). The strategy is **never one-shot refactor** — always diff-by-diff, with `/ponytail-review` on every PR.

## The rule (read this first)

**Never one-shot refactor a Tier 2 file.** These are core app surfaces. A one-shot refactor risks behavior regression that blocks users. The strategy is:

1. **Diff-by-diff only.** Each PR touches one concern, ≤50 LOC if possible.
2. **`/ponytail-review` on every PR.** Run it before the PR. Apply the delete-list where safe.
3. **Baseline-diff verification on every diff.** Run the targeted tests plus `bun run build`; run broader `bun run validate`/`bun run test:dom` only with the current baseline from `08_VERIFICATION_STRATEGY.md` and pass only if there are no new failures.
4. **Extract concerns only when a natural edit boundary appears.** Don't invent refactor boundaries — wait for a real feature edit that touches the concern.
5. **Track LOC over time.** Monthly `/ponytail-audit` to measure shrinkage.

## Mega-file inventory (REFRESHED 2026-06-24 — see `16_AUDIT_LOG_2026-06-24.md`)

> **All Tier 2 files have GROWN since the 2026-06-21 plan snapshot.** Internal reducer extractions landed for T2.1 and T2.2 (see `.ai/10_state/current-state.md` 2026-06-24 entries). React Doctor flagged 31 `no-giant-component` findings; they are locally suppressed and tracked in `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` as deferred structural work — not lint-only cleanup. The dead-export inventories below are spot-checked; re-verify with `rg` before any dead-export removal PR.

| # | File | LOC (2026-06-24) | LOC (2026-06-21) | Δ | Importers (2026-06-24) | Tests | Coupling | Risk | Strategy | Priority |
|---|------|----:|----:|---:|---:|---:|---|---|---|---:|
| T2.1 | `src/components/workshop/EstimateSheetContent.tsx` | **3550** | 2950 | +600 | 1 (dynamic) | 16 | Very-high | High | split-by-concern | 4 |
| T2.2 | `src/components/workshop/component-library/index.tsx` | **3409** | 2541 | +868 | 2 | 1 | High | High | split-by-concern | 5 |
| T2.3 | `src/lib/repositories/workspace-repository.ts` | **3242** | 2695 | +547 | **36** (was 37) | 10 | Very-high | High | split-by-concern | **1** |
| T2.4 | `src/lib/ai/package-builder/draft.ts` | **2443** | 2412 | +31 | 1 | 2 | Medium | Medium | diff-by-diff | 7 (conditional) |
| T2.5 | `src/lib/ai/read-context.ts` | **2020** | 2023 | −3 | 1 | 2 | Medium | Medium | diff-by-diff | 6 (conditional) |
| T2.6 | `src/lib/publication/actions.ts` | **1637** | ~1538 | +99 | **4** (was 5) | 3 | High | High | split-by-concern | 2 |
| T2.7 | `src/lib/component-library/actions.ts` | **1749** | ~1591 | +158 | **14** | 3 | Very-high | High | split-by-concern | 3 |

**Priority rationale (revised from Agent B data):**
- **Agent B recommended:** `workspace-repository.ts` first (clearest separation of concerns despite wide fanout).
- **This plan recommends:** Start with `publication/actions.ts` (T2.6) — 5 importers is a safer first refactor than 37 importers. Once the pattern is proven on T2.6/T2.7, tackle `workspace-repository.ts` (T2.3) with confidence.
- **The safest order for a team new to ponytail refactoring:** T2.6 → T2.7 → T2.3 → T2.2 → T2.1 (highest risk last).
- **Agent B's order for a team confident in the pattern:** T2.3 → T2.7 → T2.1 → T2.6 → AI modules.
- **Pick the order that matches the team's confidence.** Both are defensible.

## T2.1 `src/components/workshop/EstimateSheetContent.tsx` (2950 LOC)

**Largest function:** `EstimateSheetContent` — 1881 LOC (lines 1042-2922). Single component doing: history, export, library wiring, tree rendering, grid editing, sidebar coordination.

**Ponytail ask:** "Does this need to exist as one component? Split by concern."

**Natural split candidates (extract when a natural edit boundary appears):**
- History panel (undo/redo, version snapshots)
- Export button + menu
- Library wiring (drag source, component catalog connection)
- Tree renderer (group/area nodes, drag-and-drop)
- Grid editor (row items, inline editing)
- Sidebar coordinator (selection state, expansion)

**Validated coupling (Agent B):**
- **Importers:** 1 — `src/components/workshop/EstimateWorkspaceClient.tsx` (dynamic import of `EstimateSheetContent`)
- **Consumed exports (source):** `EstimateSheetContent` (the component)
- **Dead exports (zero source importers — only tests use them):** 25 — `createEstimateRowItemId`, `createComponent`, `createDefaultLibraryBundles`, `exportLibraryItemsToCsv`, `expandLibraryBundle`, `exportLibraryItemsToJson`, `filterComponents`, `getComponentDesignation`, `getComponentDiscipline`, `getComponentImageUrl`, `getLibraryBundleTotal`, `getComponentName`, `getComponentPrice`, `getStalenessLabel`, `getStalenessTone`, `groupComponents`, `parseLibraryCsv`, `parseLibraryImportText`, `parseLibraryJson`, `readLibraryPreferences`, `safeSetJsonStorage`, `searchComponents`, `sortComponents`, `EstimateRightSidebar`, `pesoFormatter`
- **Barrel/re-export:** Yes — re-exports `EstimateRightSidebar` and many helpers
- **Direct test files:** 16 — `estimate-sheet-cost-inputs`, `estimate-sheet-library-lazy-load`, `estimate-sheet-row-details-crud`, `estimate-mixed-content`, `component-library-helpers`, `route-transition-peak-load-profile`, `estimate-sheet-library-insert`, `estimate-sheet-version-control-ui`, `estimate-template-drop-zones`, `proposal-export-preview`, `estimate-tree-context-menu`, `estimate-empty-tab-state`, `perf/estimate-sheet-cursor-isolation`, `perf/estimate-sheet-memoization`, `perf/estimate-sheet-render-baseline`, `perf/estimate-sheet-render-relief`
- **Hot path:** Yes — render-critical estimate editor on the main workshop route
- **Component props (18):** `selectedNodeId, nodes, projectId, estimateId, estimateTabs, activeTabId, dataTabId, canEditEstimate, initialTabId, onActiveTabChange, onEstimateTabsChange, collaborationUserId, collaborationDisplayName, proposalExportMetadata, renderSidebar, libraryItems, libraryTemplates, libraryCategoryTree, librarySuppliers, libraryBrands, libraryFolders`
- **Render sites:** 16 JSX files total (1 source: `EstimateWorkspaceClient.tsx`, plus 15 tests)
- **State/context:** No FSM; hook-heavy orchestration with many `useState/useEffect/useMemo/useRef` buckets plus custom selection/tree/mutation/history hooks and surface-variant context

**Refactor risk:** **High.** Core estimate editing surface. Stateful editor logic is densely intertwined. 16 test files provide good regression coverage but also mean many test touchpoints to update.

**Ponytail opportunity:** **25 dead exports** — these helpers are only used by tests, not by any source code. `EstimateSheetContent.tsx` already re-exports helper names from `src/components/workshop/component-library/helpers`; the action is to remove the compatibility re-exports from the mega-component and update tests/importers to the existing helper module, not create a second helper module. This is the single biggest ponytail cut in Tier 2.

**Strategy:** Diff-by-diff. Start by removing the 25 compatibility exports from `EstimateSheetContent.tsx` and pointing tests at `component-library/helpers` (one PR, no behavior change). Then split by concern as natural edit boundaries appear. `/ponytail-review` on every PR. Priority 4.

**Browser QA per diff:**
- Open an estimate
- Edit rows (add, remove, rename, reorder)
- Add/remove group/area nodes
- Use history (undo/redo)
- Export
- Verify tree + grid + sidebar all still coordinate

## T2.2 `src/components/workshop/component-library/index.tsx` (2541 LOC)

**Largest function:** `EstimateRightSidebarBase` — 1748 LOC (lines 786-2533).

**Ponytail ask:** "Peel off local hooks/helpers. One component doing 5 jobs."

**Natural split candidates:**
- Search/filter logic
- Category tree navigation
- Card list rendering
- Drag source (for dragging components into estimates)
- Detail panel (selected component metadata)

**Validated coupling (Agent B):**
- **Importers:** 2 — `EstimateSheetContent.tsx`, `library/template-editor/TemplateEditorClient.tsx`
- **Consumed exports:** `EstimateRightSidebar` (the exported wrapper)
- **Dead exports:** None
- **Barrel/re-export:** No (despite the `index.tsx` name — it's an entry point, not a re-export barrel)
- **Direct test files:** 1 — `component-library-ui.test.tsx`
- **Hot path:** Yes — sidebar entrypoint for estimate/template editor surfaces
- **Component props (19):** `onInsertComponent, onInsertTemplate, onInsertTemplateNode, projectId, estimateId, selectedNodeId, selectedNodeKind, selectedNodeName, templateTargetName, canInsertTemplate, nodes, initialLibraryItems, templates, projectSources, onInsertProjectSource, categoryTree, suppliers, brands, libraryFolders, onLibraryDataChanged, templateCreateMode`
- **Render sites:** 0 direct `<EstimateRightSidebarBase>` JSX sites; exported wrapper `<EstimateRightSidebar>` is rendered in 3 files (`EstimateSheetContent.tsx`, `TemplateEditorClient.tsx`, `component-library-ui.test.tsx`)
- **State/context:** No FSM; heavy local state with `useState/useEffect/useMemo/useRef/useDeferredValue`, storage hydration, optimistic template reconciliation, and workspace-selection context

**Refactor risk:** **High.** Local state/hydration/optimistic-sync behavior is easy to regress. Only 1 direct test file means less regression coverage than T2.1.

**Strategy:** Diff-by-diff. Split by concern. `/ponytail-review` on every PR. Priority 5.

**Browser QA per diff:**
- Open the library sidebar
- Search for a component
- Filter by category
- Drag a component into an estimate
- View a component's detail panel

## T2.3 `src/lib/repositories/workspace-repository.ts` (2695 LOC)

**Ponytail ask:** "Separate access resolution, query orchestration, and DTO mapping."

**Natural split candidates:**
- Access guards (workspace membership, role checks)
- Query builders (Supabase queries for workspace, projects, estimates)
- Response shaping (DTO mapping, type narrowing)
- RPC wrappers (stored procedure calls)

**Validated coupling (Agent B):**
- **Importers:** **37** — the widest fanout in the set. Includes:
  - `src/app/workshop/page.tsx`, `src/app/workshop/projects/page.tsx`, `src/app/workshop/projects/[projectId]/layout.tsx`, `src/app/workshop/projects/[projectId]/page.tsx`, `src/app/workshop/projects/[projectId]/estimates/page.tsx`, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
  - `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `src/app/api/projects/images/route.ts`, `src/app/api/component-library/images/route.ts`, `src/app/api/component-library/attachments/route.ts`
  - `src/components/workshop/projects-page-client.tsx`, `WorkshopPageShell.tsx`, `WorkshopHomebaseClient.tsx`, `ManageGroupsPopover.tsx`, `ProjectChromeAsync.tsx`, `LiveProjectCard.tsx`, `dashboard/lib.ts`
  - `src/lib/workshop/group-actions.ts`, `actions.ts`, `src/lib/collaboration/summary-actions.ts`, `src/lib/publication/actions.ts`, `src/lib/reusable-sources/actions.ts`, `src/lib/estimates/express-promotion-actions.ts`, `actions.ts`, `src/lib/projects/location-actions.ts`, `actions.ts`, `src/lib/favorites/sidebar-favorites-actions.ts`
  - `src/lib/repositories/project-charts-repository.ts`, `project-activity-repository.ts`, `estimate-favorites-repository.ts`, `project-location-repository.ts`, `component-library-repository.ts`, `project-data-repository.ts`
  - `src/lib/component-library/template-editor-actions.ts`, `actions.ts`, `project-component-projection.ts`
  - `src/lib/ai/package-builder/apply.ts`
- **Consumed exports (21):** `ensureDefaultWorkspace, getWorkshopHomebaseData, listMainSidebarFavoriteProjects, listCurrentWorkspaceProjects, getCurrentWorkspaceProject, getProjectCollaborationSummary, getProjectPublicationSummary, listProjectEstimates, listProjectEstimateSheets, getEstimateTabs, resolveEstimateEditCapability, getEstimateTabTree, getEstimateTreesForTabs, getProjectEstimateTreeByEstimate, resolveEstimateTabRouteContext, WorkshopProjectSummary, WorkshopEstimateSummary, WorkshopHomebaseData, ProjectFavoriteEstimateSheetSummary, WorkshopPendingInviteSummary, WorkshopRemovedProjectFavoriteSummary, ProjectGroupSummary`
- **Dead exports (13 — zero source importers):** `WorkspaceBootstrap, readPublicationSnapshotStaleness, readLatestPublicationActivityTimestamp, isWorkspaceHomebaseSummaryRolloutError, parseWorkshopHomebaseSummaryPayload, EstimateTreeNodeQueryRow, EstimateTreeRowItemQueryRow, LEGACY_MAIN_TAB_ID, buildEstimateTree, getDefaultEstimateTab, LiveEstimateTabTree, LiveEstimateTreesForTabsResult, groupEstimateTabTrees, getProjectEstimateTreeByNode`
- **Barrel/re-export:** No
- **Direct test files:** 10 — `workshop-dashboard-recent-favorites`, `workspace-repository-estimate-tree`, `list-project-estimates-columns`, `projects-page-view-mode`, `proposal-export-tab-grouping`, `project-publication-summary`, `projects-page-card-layout`, `workshop-homebase-summary-rpc-contract`, `projects-page-group-mode`, `workshop-pending-invite`
- **Hot path:** Yes — backs workshop pages, route handlers, and several server actions
- **Coupling:** Very-high — widest fanout in the set plus mixed workspace/homebase/estimate/publication responsibilities

**Refactor risk:** **High.** 37 importers means any change to the public API touches many files. But the internal separation (access/query/mapping) is clearer than T2.1/T2.2.

**Ponytail opportunity:** **13 dead exports** — these can be removed (or moved to a legacy module) in a first pass. This is a safe PR that shrinks the public API surface without touching the 21 consumed exports.

**Strategy:**
- **Pass 1 (safe):** Remove the 13 dead exports. One PR. Low risk — no source importer uses them. Run the 10 affected tests.
- **Pass 2+ (diff-by-diff):** Split by concern (access guards / query builders / mapping / RPC wrappers). Each PR ≤50 LOC. `/ponytail-review` on every PR.
- Priority 1 (Agent B) or Priority 3 (safety-first). See priority note above.

**Browser QA per diff:**
- Open the workshop homebase (dashboard)
- Verify projects/estimates load
- Open a project
- Verify estimates list loads

## T2.4 `src/lib/ai/package-builder/draft.ts` (2412 LOC)

**Ponytail ask:** "Heuristic parser with many one-off text helpers. Collapse by concern."

**Natural split candidates:**
- Text extraction (input parsing)
- Line-item classification (heuristic categorization)
- Assembly (building the estimate structure)
- Validation (sanity checks on output)

**Conditional:** This file is only relevant if SF.1 (AI surface) is kept. If AI is cut, **delete the file** instead of refactoring.

**Validated coupling (Agent B):**
- **Importers:** 1 — `src/app/api/ai/package-builder/handler.ts`
- **Consumed exports:** `buildPackageBuilderDraft, refinePackageBuilderDraft`
- **Dead exports:** None
- **Barrel/re-export:** No
- **Direct test files:** 2 — `ai-package-builder-apply.test.ts`, `ai-package-builder-draft.test.ts`
- **Hot path:** Yes — API handler path for AI package builder (only if AI enabled)
- **Coupling:** Medium — big file, but fanout is narrow (1 runtime caller)

**Refactor risk:** **Medium.** Contained caller surface, but complex internals. 2 test files provide good regression coverage.

**Strategy:** Decide SF.1 first. If keeping, **diff-by-diff** (not split-by-concern — the narrow fanout means the internal structure is less impactful). If cutting, delete. Priority 7 (conditional).

**Browser QA per diff (only if AI kept):**
- Enable AI routes via env
- Open the AI package builder
- Submit a natural-language prompt
- Verify the draft estimate is produced

## T2.5 `src/lib/ai/read-context.ts` (2023 LOC)

**Ponytail ask:** "One giant dispatcher. Break by intent/domain."

**Natural split candidates:**
- Intent detection (what is the user asking?)
- Domain context gathering (estimate, project, library)
- Response shaping

**Conditional:** Same as T2.4 — only if SF.1 keeps AI.

**Validated coupling (Agent B):**
- **Importers:** 1 — `src/app/api/ai/ask/handler.ts`
- **Consumed exports:** `readAiAskReadContext, AiAskReadContext`
- **Dead exports (2):** `AiAskProviderReadContext, AiAskReadContextInput`
- **Barrel/re-export:** No
- **Direct test files:** 2 — `ai-ask-route.test.ts`, `ai-ask-read-context.test.ts`
- **Hot path:** Yes — AI ask API route depends on it directly (only if AI enabled)
- **Coupling:** Medium — single runtime caller, but the path is production-critical

**Refactor risk:** **Medium.** Route behavior is sensitive even though fanout is small.

**Strategy:** Decide SF.1 first. If keeping, **diff-by-diff** (narrow fanout). If cutting, delete. Priority 6 (conditional).

## T2.6 `src/lib/publication/actions.ts` (~1538 LOC)

**Ponytail ask:** "Repeated auth/rate-limit/client helpers. Extract shared helper."

**Natural split candidates:**
- Shared auth guard (workspace membership check)
- Shared rate-limit helper
- Shared client instantiation
- Publication CRUD (create, read, update, delete share links)
- Recipient management
- Comment/decision handling

**Validated coupling (Agent B):**
- **Importers:** 5 — `src/app/api/share/[token]/decision/route.ts`, `src/app/api/share/[token]/comment/route.ts`, `src/components/share/SharedLinkActivityFeed.tsx`, `src/components/workshop/ProjectPublicationHeader.tsx`, `src/components/workshop/publication/RecipientEmailComposer.tsx`
- **Consumed exports (12):** `maybeTriggerSharedLinkActivityDigest, loadSharedLinkActivity, ActivityItem, createProjectPublication, refreshProjectPublicationSummary, republishProjectPublication, revokeProjectPublication, rotateProjectPublicationLink, addSharedLinkRecipients, listSharedLinkRecipients, removeSharedLinkRecipient, readSharedLinkEmailDeliveryReadiness, resendSharedLinkRecipientEmail`
- **Dead exports (1):** `SharedLinkEmailDeliveryReadiness`
- **Barrel/re-export:** No
- **Direct test files:** 3 — `project-publication-activity.test.tsx`, `project-publication-resolved-ids.test.ts`, `project-publication-rotate-resend.test`
- **Hot path:** Yes — shared-link routes and publication management UI hit it directly
- **Coupling:** High — multiple route handlers plus publication UX depend on it

**Refactor risk:** **High.** Changing it touches shared-link delivery, activity, and publication lifecycle. But the 5 importers are a manageable fanout.

**Security invariant checklist before any T2.6 diff:** actor, required role, workspace/project/publication scope, RLS expectation, service-role boundary if any, rate-limit key, token authority for public share routes, deny-before-mutate test, and forbidden cross-workspace access test. Browser QA alone is not sufficient for this server-action path; see `14_SECURITY_AND_NETWORK_CONTRACTS.md`.

**Strategy:** Extract shared auth/rate-limit helper first (clearest duplication). Diff-by-diff. `/ponytail-review` on every PR. **Priority 1 (safety-first) — start here.** The 5-importer fanout is the safest first refactor to prove the pattern.

**Browser QA per diff:**
- Create a share link from a project
- Open the share link in an incognito window
- Verify it renders correctly
- Add a comment (if enabled)
- Submit a decision (if enabled)
- Test password protection (if enabled)

## T2.7 `src/lib/component-library/actions.ts` (1591 LOC)

**Ponytail ask:** "Duplicated access checks/validators. Factor common pattern."

**Natural split candidates:**
- Shared access check (workspace + library folder permissions)
- Shared validator (component schema validation)
- Component CRUD (create, read, update, delete components)
- Variant/price option management
- Brand/supplier management
- Attachment/image handling
- Template management
- Search

**Validated coupling (Agent B):**
- **Importers:** **14** — `LibraryPageClient.tsx`, `EstimateSheetContent.tsx`, `component-library-manager/ComponentLibraryManager.tsx`, `AddComponentModal.tsx`, `LibraryFolderTree.tsx`, `component-library/NewTemplateModal.tsx`, `component-library/index.tsx`, `library/templates-browse/TemplatesBrowsePageClient.tsx`, `InsertIntoEstimatePicker.tsx`, `TemplatesBrowseManager.tsx`, `library/overview/LibraryOverviewSearch.tsx`, `library/template-editor/TemplateEditorClient.tsx`, `library/EditComponentDrawer.tsx`, `library/ComponentInspectorDock.tsx`
- **Consumed exports (grouped):**
  - Loaders: `loadCurrentWorkspaceComponentLibrary, loadProjectComponentLibraryLite, loadCurrentWorkspaceComponentRowsLibrary, loadProjectComponentRowsLibrary, loadCurrentWorkspaceEstimateTemplates`
  - Component CRUD: `createCostLibraryComponent, ComponentLifecycleState, CreateCostLibraryComponentInput, updateCostLibraryComponent, upsertCostLibraryComponentPriceOption, getCostLibraryComponentUsage`
  - Folder ops: `createLibraryFolder, renameLibraryFolder, deleteLibraryFolder, reorderLibraryFolders, moveCostLibraryComponentToFolder`
  - Template ops: `createEstimateTemplateFromEstimateNode, createEstimateTemplateFromEstimateTab, createEstimateTemplate, duplicateEstimateTemplate, renameEstimateTemplate, deleteEstimateTemplate, moveEstimateTemplateToCategory, renameTemplateCategory`
  - Insert targets: `listEstimateInsertTargets, resolveEstimateTemplateInsertTarget, EstimateInsertTargetProject`
  - Search: `searchLibraryOverview, LibraryOverviewSearchResult`
- **Dead exports (16):** `ComponentPriceOptionInput, ComponentVariantCostEntryInput, ComponentVariantAttachmentInput, CostLibraryComponentInput, LibraryFolderActionResult, CreateLibraryFolderOptions, ReorderLibraryFoldersInput, MoveCostLibraryComponentToFolderInput, BulkArchiveLibraryComponentsInput, ExecuteBulkArchiveLibraryComponentsInput, loadCurrentWorkspaceComponentLibraryLite, changeCostLibraryComponentLifecycleState, CreateEstimateTemplateFromNodeInput, CreateEstimateTemplateFromTabInput, LibraryOverviewSearchComponent, LibraryOverviewSearchTemplate`
- **Barrel/re-export:** No
- **Direct test files:** 3 — `component-library-folder-actions.test.ts`, `component-library-ui.test.tsx`, `component-library-actions-revalidation.test.ts`
- **Hot path:** Yes — powers the component-library manager, templates, and estimate insertion flows
- **Coupling:** Very-high — broad CRUD/search/template surface with many UI consumers

**Refactor risk:** **High.** 14 importers means any change to the public API touches many UI components.

**Security invariant checklist before any T2.7 diff:** actor, required role, workspace/library/folder scope, RLS expectation, service-role boundary if any, rate-limit key, file attachment/image authorization, deny-before-mutate test, and forbidden cross-workspace access test. See `14_SECURITY_AND_NETWORK_CONTRACTS.md`.

**Ponytail opportunity:** **16 dead exports** — these can be removed (or moved to a types module) in a first pass. Safe PR that shrinks the public API surface.

**Strategy:**
- **Pass 1 (safe):** Remove the 16 dead exports. One PR. Low risk — no source importer uses them. Run the 3 affected tests.
- **Pass 2+ (diff-by-diff):** Extract shared access-check helper. Split by concern (CRUD / templates / search / folders). `/ponytail-review` on every PR.
- Priority 2 (safety-first) or Priority 2 (Agent B). Both agree this is high priority.

**Browser QA per diff:**
- Open the component library
- Add a new component
- Edit a component's variants/pricing
- Add an attachment/image
- Delete a component
- Verify all changes persist

## Execution priority order (two defensible options)

### Option A — Safety-first (recommended for teams new to ponytail refactoring)

Start with the lowest-fanout file to prove the pattern, then work up:

1. **T2.6** (`publication/actions.ts`, 5 importers) — extract shared auth/rate-limit helper
2. **T2.7** (`component-library/actions.ts`, 14 importers) — remove 16 dead exports, then factor shared access check
3. **T2.3** (`workspace-repository.ts`, 37 importers) — remove 13 dead exports, then split by concern
4. **T2.2** (`component-library/index.tsx`, 2 importers) — split by concern (high risk despite narrow fanout — stateful component)
5. **T2.1** (`EstimateSheetContent.tsx`, 1 importer) — extract 25 dead exports to helpers module, then split by concern
6. **T2.5** (`read-context.ts`, 1 importer) — only if AI kept; diff-by-diff
7. **T2.4** (`package-builder/draft.ts`, 1 importer) — only if AI kept; diff-by-diff

### Option B — Agent B's recommendation (for teams confident in the pattern)

Start with the file that has the clearest separation of concerns, even if fanout is wide:

1. **T2.3** (`workspace-repository.ts`) — clearest internal separation (access/query/mapping)
2. **T2.7** (`component-library/actions.ts`) — broad surface but clear action categories
3. **T2.1** (`EstimateSheetContent.tsx`) — 25 dead exports are the single biggest ponytail cut
4. **T2.6** (`publication/actions.ts`) — extract shared helpers
5. **T2.2** (`component-library/index.tsx`) — stateful, defer
6. **T2.5** + **T2.4** — only if AI kept

**Pick the order that matches the team's confidence.** Both are defensible.

## The `/ponytail-review` discipline (THE ongoing value)

The one-time cuts are Wave 1-2. The **ongoing value** of this plan is making `/ponytail-review` a habit for every PR that touches a Tier 2 file. This prevents over-build recurrence.

**How to run it:**
- In OpenCode: `/ponytail-review` (slash command)
- In Codex: `@ponytail-review` (skill invocation)
- In Claude Code: `/ponytail-review` (slash command)

**When to run it:**
- **Every PR that touches a Tier 2 file.** No exceptions.
- **Every PR that adds a new dependency.** Ponytail's ladder rung 4 asks "does an installed dep already do this?"
- **Every PR that adds a new wrapper/helper/util.** Ponytail asks "3+ callers?" before letting you abstract.

**What to do with the output:**
- Apply the delete-list where safe.
- Add `ponytail:` comments for intentional shortcuts with known ceilings.
- If ponytail flags something as over-built, consider cutting it in this PR (not a follow-up).

## Anti-patterns (DO NOT)

- **DO NOT one-shot refactor a mega-file.** "I'll just rewrite EstimateSheetContent.tsx this weekend" is how behavior regressions ship.
- **DO NOT skip `/ponytail-review`** because "the diff is small." Small diffs are exactly where ponytail catches over-build before it accumulates.
- **DO NOT add a new abstraction to a mega-file** without ponytail's 3+ callers check.
- **DO NOT refactor a mega-file while another agent is editing it.** Check `git status` and `11_AGENT_COORDINATION_LEDGER.md` first.
- **DO NOT start with T2.1 unless using Option B.** It's the highest risk despite narrow fanout — the 1881-LOC component has densely intertwined state.
- **DO NOT refactor T2.4/T2.5 before SF.1 is decided.** If AI is cut, the files are deleted, not refactored.

## Success metric

Wave 3 is **ongoing** — there's no single completion. Track:
- Monthly `/ponytail-audit` to measure LOC delta per mega-file
- Every PR touching a Tier 2 file has a `/ponytail-review` in the PR description or comments
- Over 6 months, each mega-file should shrink by ≥20% (or be justified as "can't shrink further")

## Dead-export cleanup opportunities (safe first PRs)

Agent B identified **57 dead exports** across the 7 mega-files — these are exported but have zero source importers (only tests use some of them). Removing them is a safe first PR per file:

| File | Dead exports | Notes |
|------|---:|---|
| T2.1 `EstimateSheetContent.tsx` | 25 | Helpers + `EstimateRightSidebar` re-export + `pesoFormatter`. Remove compatibility exports and update tests/importers to existing `src/components/workshop/component-library/helpers`. |
| T2.3 `workspace-repository.ts` | 13 | Types + legacy functions. Remove or move to legacy module. |
| T2.7 `component-library/actions.ts` | 16 | Types + unused functions. Remove or move to types module. |
| T2.5 `read-context.ts` | 2 | `AiAskProviderReadContext`, `AiAskReadContextInput`. Remove. |
| T2.6 `publication/actions.ts` | 1 | `SharedLinkEmailDeliveryReadiness`. Remove. |
| T2.2, T2.4 | 0 | None |

**Total: 57 dead exports** (25+13+16+2+1 = 57). These are the safest first PRs — they shrink the public API surface without touching any consumed export. Run the affected test files after each removal.
