# 03 — Source And Codebase Audit

All paths are repo-relative. Evidence is from current `main` source. No files were modified. This audit is the factual basis for `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` and `11_IMPLEMENTATION_PLAN.md`.

## A. Project list, creation, empty state

### `src/app/workshop/projects/page.tsx` (Server Component)
- `ProjectsData` (async) calls `listCurrentWorkspaceProjects()` and **filters to `accessKind === "owned"`** before passing to `ProjectsPageClient`. Shared/pending-invite projects are NOT on this route.
- Wraps `ProjectsData` in `<Suspense fallback={<ProjectsListSkeleton/>}>`; shell flushes immediately.
- `loading.tsx` → `ProjectsListSkeleton`. No `error.tsx`/`not-found.tsx` at this segment.

### `src/components/workshop/projects-page-client.tsx` (~3453 lines)
- `ProjectsPageClient` (export, `:1410`). Props: `projects`, `favoriteProjectIds`, `favoritesScope`, `googleMapsApiKey/MapId`, `projectGroups`.
- **State:** single `useReducer` (`:1427`) holds ALL local UI state (modal open, expanded project, status tab, search, optimistic creates, sort, group order, selection, delete preview). **No Zustand, no TanStack Query for the list.** Server data arrives as RSC props; refreshed via `router.refresh()`.
- **URL state: NONE.** Search, tab, sort, group-by, selection, modal-open are in-memory (lost on refresh). View-mode + group-by persist to `localStorage` (`archestimator_projects_view_mode_v1`, `archestimator_projects_group_by_v1`).
- **TanStack Query:** only `useToggleProjectFavorite` (`:1420`) — favorite toggling. No list query keys.
- **Empty states (GAP):**
  - `hasNoSearchResults` (`:1952`) → `data-project-search-empty-state` (`:3239-3275`): "No search results for "{query}"" + Clear search.
  - `hasNoStatusResults` (`:1956`) → `data-project-status-empty-state` (`:3276-3309`): "No {status} projects yet." + Show all.
  - `hasProjectEmptyState = hasNoSearchResults || hasNoStatusResults` (`:1960`) — **only true under an active filter**. With zero owned projects and no filter, `displayLiveProjects.map(...)` (`:3397`) renders an **empty grid** — **no zero-project onboarding CTA**.
- **Primary CTA:** "Add projects" (`Cards` icon, `:2147-2152`) in `projectToolbarActions` → opens `NewProjectModal` (lazy, `:192`). "Add group" (`FolderPlus`, `:2139`).
- **Optimistic create pipeline:** `handleOptimisticProjectChange` (`:2185`) receives `NewProjectOptimisticSnapshot`; upserts into `optimisticProjectCreates` keyed by `clientId`; reconciliation effect (`:2094`) retires the snapshot once the server prop contains the real id.
- **Card open:** `LiveProjectCard` → `<Link href={/workshop/projects/${id}}>` (list `:684`; small tile `:831`). Lands on **Dashboard**.
- **HREF MISMATCH (GAP):** sidebar favorite toggle handler (`:2854`) builds favorite `href` as `/workshop/projects/${projectId}/estimates` (Estimates list), while the card opens the Dashboard. Inconsistent start destination.
- Known giant-component suppression (`:1409`, tracked by `2026-06-23-react-doctor-warning-cleanup`).

### `src/components/workshop/NewProjectForm.tsx` (436 lines)
- `NewProjectForm` (export, `:178`). `NewProjectOptimisticSnapshot` type (`:45`).
- **Fields** (in `NewProjectFormSections.tsx`): name (required), client (CreatableCombobox), currency (default "PHP"), project code (auto-gen + "Generate" wand), location (Google Places), project image (optional).
- **Validation:** only `name` is validated before submit (`:266`: "Add a project name before creating this project."). `noValidate` on form (`:371`).
- **`handleSubmit` pipeline (`:238-366`):**
  1. Optimistic `creating` snapshot + `onSuccess` (closes modal) (`:277-283`).
  2. `createProjectRecord(formData)` (`:285`).
  3. If place selected: `saveProjectLocation(...)` (`:294`) — failures non-fatal.
  4. If image: `uploadProjectImage` (`:313`) → `updateProjectImageMetadata` (`:330`).
  5. **`createEstimateSheetDraft(project.id)` (`:335`) — every new project auto-gets one default empty estimate.** (ASSUMP-03.)
  6. `router.refresh()` (`:338`).
  - On project-create failure: remove optimistic row + toast (`:342-355`). On setup failure (project created, later steps failed): keep card with `error` setupStatus, re-enable navigation (`:356-359`).

### `src/components/workshop/NewProjectModal.tsx` (87 lines)
- Thin dialog around `NewProjectForm` (`showHeader={false}`). Title chrome "Projects / Create project". `initialFocus="first"` focuses name input. Max width `min(1380px, 100vw-2rem)`.

### `src/components/workshop/NewProjectFormSections.tsx` (411 lines)
- `CreateProjectFooter` (`:358`) holds the primary submit CTA: `variant="brand"` "Create project"/"Creating", `Plus` icon, disabled while submitting (`:396-407`). Single armed create affordance.
- Field labels tiny uppercase (9px). Field order: name → client → currency → project code → location.

### `src/components/workshop/LiveProjectCard.tsx` (855 lines)
- `LiveProjectCard` (memo, `:854`) + `LiveProjectCardImpl` (`:211`).
- Renders list row (`:544`) or tile (small/medium/large, `:703`). Two-layer glass; hover/focus reveals controls. `[content-visibility:auto]` perf (`:736-741`).
- `projectHref = /workshop/projects/${project.id}` (`:255`) → card body link (list `:684`, tile `:830`) + footer action (`ProjectCardFooterAction.tsx:96`). Prefetch on hover.
- `setupNavigationDisabled` suppresses navigation during optimistic create.
- `ProjectCardSetupOverlay` covers card with spinner/error during create pipeline.
- Access-mode badges: pending-invite / shared / sheet-member / owned.

### `src/components/workshop/ProjectCardDetailsControl.tsx` (57 lines)
- `DotsThreeVertical` button; blocks during setup; calls `onClick` then `onExpand`.

## B. Project dashboard & estimates table

### Routes (`src/app/workshop/projects/[projectId]/`)
- `layout.tsx` (`:49`, Server, async): `WorkshopPageShell` + `ProjectMiniSidebar` (Dashboard/Estimates/Data/Activity, `ProjectMiniSidebar.tsx:23`) + `ProjectEstimateMetadataStrip` + `ProjectChromeAsync`. Suspense fallback `ProjectRouteContentFallback`.
- `page.tsx` (dashboard, `:38`, Server, async): `getCurrentWorkspaceProject`; redirects `/workshop?removedProject=…` if UUID project gone (`:44`), else `notFound()`. Loads estimate count, recent sheets, activity, location, client options. Sample-project fallback (`:48-55`, `canEdit:false`).
- `estimates/page.tsx` (`:17`, Server): `Suspense` + `ProjectEstimatesContent` (`:25`). `listProjectEstimates(projectId)` + favorites + edit capabilities + sidebar favorites. `notFound()` if no project.
- `estimates/[nodeId]/page.tsx` (`:55`, Server): the estimate editor route. `notFound()` if no project/estimate. Resolves tree/tabs/edit capability.
- `loading.tsx` + `error.tsx` exist at `estimates/` and `estimates/[nodeId]/`. Dashboard has `loading.tsx` only.

### `src/components/workshop/ProjectDashboardClient.tsx`
- `ProjectDashboardClient` (export, `:783-921`). Props include `estimateCount`, `recentEstimateSheets`, `canEditProject`.
- `RecentEstimateSheetLinks` (`:134-177`): up to 5 recent sheet links; empty state `<p>No estimate sheets yet</p>` (`:142-148`).
- `ProjectEstimateSummaryPanel` (`:179-234`), `ProjectEstimateCostStrip` (`:236-269`, "No estimate sheet"/"—" cells), `ProjectEstimateBudgetHealthPanel` (`:402-526`, "No estimate sheet"), `ProjectActivityFeedPanel` (`:528-635`, "No sheet changes yet").
- `ProjectIdentityFields` (`:637-720`) + `AutoSubmitForm` (`:742-781`, blur-submits via `updateProjectDetails`).
- **GAP:** Dashboard is read-mostly; **no "create estimate" CTA and no link to Estimates tab** — an empty project gives the user no obvious next step.

### `src/components/workshop/ProjectEstimatesTable.tsx` (~1177 lines)
- `ProjectEstimatesTable` (export, `:1181`); giant-component suppression (`:480`).
- Columns: select / open / favorite / duplicate / sheet_code / **name** / notes / project_budget / totalProjectCost / overbudget / updated_at / created_at / delete. Default sort `updated_at desc`.
- **Empty state (GAP):** `ProjectEstimateFillerRows` (`:409-445`) renders filler rows to `EMPTY_TABLE_ROW_COUNT` (60). At `rowIndex===0`, name column (`ESTIMATE_NAME_COLUMN_INDEX=5`) renders `ProjectEstimateBlankNameCreateCell` (`:343-407`, an inline `<input>` with `aria-label="Create estimate from blank name cell"`, `title="Enter an estimate name."`) when `canCreateEstimates && !showEmptyMessage`. **`showEmptyMessage` is hardcoded `false` at the call site (`:1123`)** — so `emptyMessage` ("No estimates yet") is effectively never shown. The empty state is a subtle inline input, not a prominent "start here" surface.
- Column widths persist to `localStorage` `archestimator:project-estimates-column-widths:${projectId}`.
- **No estimate status field** — `ProjectEstimateListRow`/`EstimateRow` have no status column. Only client-only `pendingStatus: "creating"|"duplicating"` for optimistic UI.

### `src/components/workshop/ProjectEstimatesClient.tsx`
- `ProjectEstimatesClient` (export, `:238-414`). `OPTIMISTIC_ESTIMATE_LIST_ENABLED = true` (`:31`, "temporary backout aid, removed after P0 browser QA; not permanent feature flag").
- `handleCreateEstimateSheet` (`:271-326`): builds optimistic placeholder (`pendingStatus:"creating"`, name "Creating…" or requested, `ES-###` code), inserts into store, calls `createEstimateSheetDraft`, reconciles/rolls back.
- **Primary CTA:** "Create Estimate" button (`NewspaperClipping` icon, `:330-390`) in `TreePanelHeader` `addActions`; label → "Creating estimate" while `isCreating`; disabled when `!canCreateEstimates || isCreating`. Calls `handleCreateEstimateSheet()` with no name (server generates `${sheetCode} Estimate`).
- Inline create path: table's first filler row → `onCreateEstimateFromName` → `handleCreateEstimateSheet` with typed name.
- UI reducer (`:109-135`): search/filter(all/favorites/recent)/sort — **NOT URL-synced** (lost on navigation).
- `canCreateEstimates` from server (`resolveEstimateListEditCapabilities` → `canEditProjectInD1`). Read-only collaborator → `false`.

### `src/components/workshop/ProjectMiniSidebar.tsx`
- Section nav: Dashboard (`/workshop/projects/${projectId}`, exact), Estimates (`/estimates`), Data (`/data`), Activity (`/activity`). Hidden on `estimates/[nodeId]` route and below `lg`.

## C. Estimate sheet start path, templates, express components

### `src/lib/estimates/actions.ts`
- `createEstimate(projectId, formData)` (`:2313`): form-action entry. `getCurrentWorkspaceProject` → `createEstimateActionsD1Client` → `assertCanEditProject` → `createEstimateWithDefaultTab` → `revalidateProjectEstimatePaths` → `redirect(/workshop/projects/${projectId}/estimates/${firstNodeId ?? estimate.id})`. **Not used by the table.**
- `createEstimateSheetDraft(projectId, input?)` (`:2336`): programmatic creator (used by optimistic flows + `NewProjectForm`). Auto-generates sheetCode; default name `${sheetCode} Estimate`; returns `{ row, estimateId, firstNodeId, sheetCode }`.
- `createEstimateWithDefaultTab` (`:1933-1979`, internal): asserts sheet-code uniqueness → inserts `estimates` row (inherits `currency_code` from project; seeds `project_budget` from project metadata; `metadata:{}`) → inserts default **"Main"** tab (`is_default:true`) → returns `{ estimate, firstNodeId: null, nodeCount: 0 }`. **A brand-new estimate starts empty (zero nodes, zero rows).**
- `insertEstimateTemplateIntoEstimate` (`:3143`), `insertEstimateTemplatesIntoEstimate` (`:3185`): template-start path.
- `duplicateEstimateSheet` (`:2368`); `createEstimateNode` (`:2887`); `createEstimateTab` (`:2791`).
- Legacy: `insertEstimateWithSheetCodeFallback` (`:1716`, `revision_label` compat); `duplicateEstimateSheet` `__legacy_default_tab__` fallback (`:2415`).

### `src/components/workshop/EstimateSheetContent.tsx` (~2820 lines)
- Main client host. Owns content-state reducer (`:521`), wires mutation hooks, right sidebar, empty-state CTA.
- **Empty-tab state (`:2746-2777`):** heading "This tab is empty" (when `estimateTree.length===0`) or "Select an area"; body "Add an Area to start, or drag a template or project content here."; two buttons (editors only): **"Add Area"** (`requestRootGroupCreate` → `REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT` `kind:"group"`, `:1690`) and **"Browse templates"** (`openTemplateBrowser` → `setShowCommandPalette(true)`, `:1693`).
- Right sidebar `EstimateRightSidebar` receives `templates={availableTemplates}` (`:2797`), `onInsertTemplate`/`onInsertTemplateNode` (`:2810`).

### `src/components/workshop/EstimateSheetTree.tsx` (`:455`)
- Left tree ("Estimate Tree"). P6 single-node model (every node = "area", holds rows + child sub-areas). CRUD: `handleAddTreeNode` (`:1036`), `handleAddArea` (`:1143`), reorder (has the live reorder RPC bug owned by `Estimate-Sheet-Tree` plan), rename, delete+undo.

### `src/components/workshop/estimate-sheet/rows/branch.tsx` (`:542`)
- `EstimateSheetBranch`: sticky header + breadcrumbs + node's own rows (rows-first, `:421`) + `ComponentDropTarget` + child sub-areas. "Unified empty state (L5/P6)" comment (`:519-523`). Renders `ComponentDropTarget` on every node (`:461-470`).

### `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`
- `EstimateDropZone` (`:29`), `ComponentDropTarget` (`:135`): at rest renders `QuietAddRowButton` (`:45`, opacity-60 dashed "Add row to {nodeName}" → `onAddBlankRow(nodeId)`); during drag swaps to `ActiveComponentDropZone` (`:69`, accepts library-item + row-item moves). `TemplateDropZone` (`:188`). **The quiet add-row strip is the primary first-row affordance** — intentional low prominence (comment `:129-134`).

### `src/components/workshop/estimate-sheet/rows/row-table.tsx` (`:941`)
- `EstimateRowItemsTable`: editable grid (Materials/Qty/Contingency/Subtotal/Adjustment/Misc/Total). TanStack Virtual for ≥~75 rows (`:995`). **Returns `null` if `items.length===0` (`:1097`)** — so empty area shows only the `ComponentDropTarget` strip.

### `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
- `createExpressEstimateRowTemplate()` (`:198`): blank express row (qty 1, itemCost 0, express metadata). `insertBlankRow` (`:740`) inserts it; records telemetry `insert_requested` (no "first row" distinction). Legacy-blank rows promoted to express on inline edit (`:549-556`).

### `src/lib/estimates/express-components.ts`
- Express component = inline-authored row, `metadata.expressComponent={kind:"express",schemaVersion:1,...}`. Authoring default **on** (`NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED`); **promotion to library default off** (`EXPRESS_COMPONENT_PROMOTION_ENABLED`). Classification (`:273`): express | linked-library | detached-library | legacy-blank | source-less-manual.

### Templates (two sources merged)
- **Fixtures:** `src/lib/component-library/estimate-templates.ts:56` — 3 seed templates ("Condo Fit-Out Starter", "Powder Room Basic", "Roof Deck Lounge"). Fallback when D1 `estimate_templates` missing.
- **D1:** tables `estimate_templates`, `estimate_template_nodes`, `estimate_template_row_items` (migration `0024`). Authoring in `src/lib/component-library/template-editor-actions.ts`. Can be made from an estimate node/tab.
- **Insertion:** `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts` — `insertTemplateIntoParent` (`:67`) optimistically clones, then `insertEstimateTemplateIntoEstimate` / `insertEstimateTemplatesIntoEstimate`. **No template chooser at estimate creation time** — only insertable after navigating into the estimate.

### `src/hooks/use-estimate-row-mutations.ts` (`:599`)
- TanStack Query mutations: `insertRow`/`replaceRow`/`updateRow`/`deleteRow`/`deleteRows`/`restoreDeletedRows`/`moveRows`/`moveRowItem`/`detachRow`/`promoteRow`. `networkMode:"always"`, optimistic tree patches, revision-conflict handling, offline detection, projection-cache sync. Save state via `useSaveState` (`:324`).

### State management (estimate)
- TanStack Query (`estimateQueryKeys`: detail/tabs/editCapability/tabTree/areaTree). Zustand: `useEstimateWorkspaceState` (selectedNodeIdByEstimateId/expandedNodeIds), `useEstimateUiStore` (drag), `estimate-column-widths-store`, `project-estimates-store`. Local reducer in `EstimateSheetContent`. Durable Object collab (`use-estimate-cursor-broadcast`, `use-estimate-row-update-broadcast`), feature-gated.

## D. Routes, navigation, auth, sidebar

### Post-login landing
- `DEFAULT_AUTH_DESTINATION = "/workshop"` (`lib/auth/redirects.ts:1`). `resolvePostAuthDestination` (`lib/auth/account-setup.ts:7`) returns `/workshop` unless next is `/workshop/pending-invite`. Login passes `next="/workshop"` fallback.
- `/workshop` (`app/workshop/page.tsx:92`, Server) renders `WorkshopDashboard` (destination card, FavoritesTree, RecentProjectsList, RecentSheetsList, Continue card). If pending-invite cookie → redirect `/workshop/pending-invite` (`:98`).
- `/workshop/onboarding` → redirect `/workshop/settings` (no onboarding wizard — owner decision).

### Auth gate (proxy + layout)
- `src/proxy.ts` → `lib/auth/request-proxy.ts:130`. `PROTECTED_PREFIXES=["/workshop"]`. No user + protected → `/login?next=<currentPath>`. Already-auth + `/login` → `/workshop`.
- Layout gate (`app/workshop/layout.tsx:23`): re-checks `isProtectedRouteGateSatisfied`, else re-resolves session/terms.

### Sidebar (`src/components/sidebar/MainSidebar.tsx`, Client)
- 5 nav items: Workshop (⌘1), Projects (⌘2, pending-invite badge), Library (⌘3), Proposals (⌘4), Publisher (⌘5).
- **Favorites** section (`:361`): favorite projects + nested favorite sheets; empty hint "Star a project or estimate sheet to pin it here." (`:467-474`). Hydrated via `useSidebarFavoritesQuery` on hover/focus/expand.
- **No "New project"/"New estimate" CTA in the sidebar.** Start CTAs are on dashboard + projects/estimates toolbars.

### Dashboard start CTAs (`src/components/workshop/dashboard/LibraryHubCard.tsx`)
- "New estimate sheet" button **disabled until a project exists** — label flips "Create a project first" / "New estimate sheet unavailable until a project exists" (`:134,141,146`).
- `Continue` card via `LibraryCardLink` when `continueEstimate` resolvable.

## E. Repo metadata, scripts, tests, migrations

### `package.json`
- Versions: `next` 16.2.10, `react`/`react-dom` 19.2.7, `better-auth` 1.6.23, `@tanstack/react-query` 5.100.14, `zustand` 5.0.14, `@opennextjs/cloudflare` ^1.20.1. `packageManager` `bun@1.3.14`.
- Scripts (relevant): `type-check` (`tsc --noEmit`), `lint` (`eslint`), `lint:design-system` (`node scripts/enforce-app-design-system.mjs`), `lint:design` (`.agents/skills/impeccable/scripts/detect.mjs --strict src/components`), `test` (`bun test tests/unit`), `test:dom` (`vitest run --maxWorkers=1`), `test:dom:watch`, `test:e2e` (`playwright test`), `validate` (chains type-check+lint+design-system+design+test+test:dom), `cf:typegen`, perf scripts (`perf:measure-routes`, `perf:check-routes`), `storybook`/`storybook:validate`.

### Tests touching start path (`tests/vitest/`)
- Projects page: `projects-page-access-tabs`, `projects-page-card-layout`, `projects-page-create-optimistic`, `projects-page-group-mode`, `projects-page-organize-control`, `projects-page-shared-access`, `projects-page-sort-controls`, `projects-page-view-mode`, `projects-page-test-harness`.
- New project: `new-project-form-validation.test.tsx`.
- Dashboard: `project-dashboard-client.test.tsx` + UI fixtures.
- Estimate start: **`estimate-bootstrap-ui.test.ts`**, **`estimate-empty-tab-state.test.tsx`**, **`estimate-sheet-create-empty-tree.test`**, `estimate-mutations.test.ts`, `estimate-repository.test.ts`, `estimate-route-cache-finalization.test.tsx`.
- Perf: `perf/projects-page-render-baseline.test.tsx`, `perf/projects-page-rpc-contract.test.ts`, `perf/projects-page-server-parallelism.test.ts`.

### Data types (`src/lib/types/database.ts`)
- `ProjectRow` (`:7-20`): `id, workspace_id, created_by, name, client_name, location, project_code, currency_code, metadata, status, created_at, updated_at`. `status: ProjectStatus` non-null default `ongoing`.
- `EstimateRow` (`:22-34`): `id, project_id, created_by, name, sheet_code, notes, currency_code, metadata, project_budget, created_at, updated_at`. **No `status`, no `workspace_id` (inherits via project), no `template` column.**

### Migrations
- `0039_project_status.sql`: `ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing','completed','archived'))` + index `idx_projects_workspace_status_updated`.
- `0029_estimate_actions_d1_support.sql`: adds `estimates.notes`, `currency_code`, `metadata` (JSON check).
- `0017_estimate_sheet_summary_fields.sql`: adds `estimates.project_budget`.
- `0024_estimate_templates.sql`: template tables.
- `0016_project_locations.sql`, `0020_project_groups.sql`: sub-entities.
- **PRECONDITION/RISK:** No migration contains the base `CREATE TABLE projects` / `CREATE TABLE estimates` — they are pre-provisioned out-of-band (proof/bootstrap scripts). This plan does **not** change schema; flagged for awareness.

### Workspace boundary (`src/lib/repositories/workspace-repository.ts`)
- `ensureDefaultWorkspace` (`:1385`, `cache()`-wrapped): branch 1 (default set + valid) → return; branch 2 (membership exists, default re-adopted) → persist default; branch 3 (new user) → bootstrap workspace "My Archestimator Workspace" + owner membership + set default. **This is exactly the empty/returning-user resolution the start path depends on.**
- `listCurrentWorkspaceProjects` (`:1453`), `getCurrentWorkspaceProject`, `getCurrentWorkspaceProjectForEstimate`, `listProjectEstimates` (`:3010`), `listProjectEstimateSheets` (`:3121`), `getWorkshopHomebaseData` (`:1788`).

## F. Sibling-plan overlap (de-conflicted)

- `2026-07-07-first-user-activation-empty-workspace` (CONDITIONALLY READY, 95): activation ladder, milestones, sample-data, welcome panel, analytics SDK. **Defer to it.** Names: `NewProjectForm.tsx`, `LibraryHubCard.tsx`, `empty-state.tsx`, `auth-onboarding-guard.test.ts`, `estimate-empty-tab-state.test.tsx`.
- `2026-07-06-Estimate-Sheet-Tree` (CONDITIONALLY READY): in-editor tree + live reorder blocker (`reorderEstimateTreeNodes` omits `target_project_id`). Not this plan's scope.
- `2026-06-03-react-joyride-onboarding-implementation-plan`: **superseded**, do not execute.

## G. Key gaps inventory (carried to requirements)

| Gap ID | Surface | Evidence |
|---|---|---|
| GAP-1 | Zero-project empty state missing | `projects-page-client.tsx:1960, 3397` |
| GAP-2 | Dashboard no first-estimate nudge | `ProjectDashboardClient.tsx` (no CTA/link) |
| GAP-3 | Estimates-table empty state is subtle inline input; `emptyMessage` never shown | `ProjectEstimatesTable.tsx:1123` (hardcoded false), `:343-407` |
| GAP-4 | No template chooser at estimate creation | `lib/estimates/actions.ts:1978` (always empty) |
| GAP-5 | Sidebar-favorite href (Estimates) ≠ card-open href (Dashboard) | `projects-page-client.tsx:2854` vs `LiveProjectCard.tsx:255` |
| GAP-6 | No activation-funnel analytics | no events at start surfaces (only generic `insert_requested`) |
| GAP-7 | No URL state for list filters / create deep-link | `projects-page-client.tsx:1427` (reducer only) |
| GAP-8 | Dead `createProject` action | `lib/projects/actions.ts:840` (never imported) |
