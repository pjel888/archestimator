# Route, State, Security, And Accessibility Contracts

## Source Hierarchy

| Source ID | Source | Controls |
| --- | --- | --- |
| SRC-001 | User target result in this plan pack | Product direction: Library Templates workbench, no nested Templates dock, Library + Project right dock. |
| SRC-002 | `AGENTS.md` and `.ai/10_state/current-state.md` fast path | Repo safety, verification policy, stack baseline, current known reds. |
| SRC-003 | Current source files under `src/app/workshop/library/templates*` and `src/components/workshop/library/*` | Actual route and component seams. |
| SRC-004 | `src/components/workshop/component-library/index.tsx` and `use-estimate-right-sidebar-state.ts` | Actual right-dock tab/state behavior. |
| SRC-005 | `DESIGN.md` and `PRODUCT.md` | Product UI density, visual constraints, app/workshop design language. |
| SRC-006 | Local Next.js docs under `node_modules/next/dist/docs/` | Version-sensitive App Router, Server/Client, Server Action, prefetch, and instant-navigation behavior. |

When sources conflict, current repo/source reality controls implementation mechanics, and the user target controls product outcome inside the safe planning boundary.

## App Router Boundary And Cache Contracts

| Route/surface | Server-owned data | Client boundary | Cache/query owner | Dynamic/rendering notes | Mutation/revalidation contract | Tests/proof |
| --- | --- | --- | --- | --- | --- | --- |
| `/workshop/library/templates` | `getCurrentWorkspaceEstimateTemplatesSeed()` in `page.tsx`, wrapped by server timing labels. | `TemplatesBrowsePageClient` and `TemplatesBrowseManager` own interactivity. | `workspaceEstimateTemplatesQueryKey({ userId, workspaceId })` when scope exists; 5 minute stale time. | Server page awaits workspace/user data, so route is authenticated/dynamic. Preserve `LibrarySurfaceVariantProvider`. | Browse mutations patch the TanStack cache or invalidate the scoped key; do not replace with broad `router.refresh()` unless a canonical reseed bug is proven. | `library-tabs-layout.test.tsx`, `library-templates-cache.test.tsx`, workbench tests. |
| `/workshop/library/templates/[templateId]` | `getEstimateTemplateById(templateId)` and workspace id validation in `page.tsx`. | `TemplateEditorClient` owns editor state; right dock is dynamically imported. | Component dock uses `workspaceComponentLibraryLiteQueryKey(workspaceId)` only after user intent. | Detail route hides Library parent tabs through existing editor chrome and breadcrumb behavior. | Existing server actions revalidate `/workshop/library/templates` and detail path; UI gating does not replace action authz. | `template-editor.test.tsx`, `template-editor-actions-authz.test.ts`. |
| Template-focused source dock host | Host supplies workspace/template context, visible tabs, and optional project selector state. | `TemplatesBrowseManager` owns `dockRequested` and selected project state; `EstimateRightSidebar` or a route-local adapter owns active source-dock tab/search/tree state. | Library data remains workspace-scoped; Project estimate-source data is project-scoped after selection. | No new route segment is introduced by the dock configurability seam. | Active tab and stored/account prefs must clamp against `visibleTabs`; excluded tabs must not fetch/render hidden tree work. | `estimate-right-sidebar-visible-tabs.test.tsx`, render perf test. |
| Project tab on templates workbench | Initial project list must be bounded and authorized; no project-source tree loads until selection. | `TemplatesBrowseManager` owns selector state and selected project id; source dock renders selector/unavailable/detail states. | Project list key `{ userId, workspaceId }`; project source key `{ userId, workspaceId, selectedProjectId }`. | No implicit active project exists on workspace Library route. | Changing selected project resets Project-tab tree/search/selection state and aborts stale loads. | Project-tab scope tests. |

## State Matrix

| State | Required UI result | Data/security rule | Proof |
| --- | --- | --- | --- |
| Loading route | Stable left/center/dock footprints; no layout collapse. | No hidden Project/Templates fetch just because the route mounted. | DOM skeleton/workbench tests. |
| Empty template library | Left rail and center explain no templates and offer permitted create path. | Viewers see truthful read-only copy, not create controls. | Workbench empty/read-only tests. |
| No selection | Center asks user to select or create a template. | No source template mutation. | Workbench center tests. |
| Category selected | Center shows category-scoped template list/table. | Selection is local to browse manager unless future persistence is approved. | Workbench center tests. |
| Template selected | Center shows selected-template preview/editor-lite, totals/counts/source trust, and `Open editor`. | Full editing remains in `[templateId]`. | Workbench selected-template tests. |
| Viewer/read-only | Browse/preview allowed; edit/delete/move/add hidden or disabled with truthful copy. | Server actions still deny direct unauthorized calls. | Editor UI + authz tests. |
| Editor/admin | Mutation affordances visible where scoped. | Action-level `is_workspace_editor` checks remain. | Existing and extended editor tests. |
| Dock not requested | Right source dock placeholder or collapsed state does not fetch heavy data. | No project/library heavy query before intent unless budgeted. | Render/query tests. |
| Dock loading/error | Loading and error states are localized and recoverable. | No broad route refresh for dock-only error. | DOM tests. |
| Project tab no scope | Project tab is visible and shows selector or unavailable state. | No fake empty project tree and no unauthorized project data. | Project-tab tests. |
| Project selected | Loads project-scoped reusable sources/components only for selected authorized project. | Query key includes workspace/user/project dimensions. | Project-tab tests. |
| Destructive confirmation | Delete/rename/move confirmations keep focus and announce failures. | Failed mutation rolls back optimistic local state. | Existing browse tests + added dialog tests. |
| Mobile/tablet | Three panes are not squeezed; use desktop notice, drawers, or read-only preview. | No hidden controls only accessible by hover. | DOM mobile test or gated browser if drawer behavior changes. |
| Timeout/offline/provider failure | Error copy preserves recoverability and does not claim success. | Mutations do not replay duplicate inserts on retry/back-forward. | UltraQA and insert-flow tests. |

## Action-Level Accessibility Proof Matrix

| Action | Keyboard path | Focus/announcement requirement | Proof type |
| --- | --- | --- | --- |
| Select template/category | Tree keyboard selection and row click. | Selected state and current row are exposed through tree semantics. | DOM test. |
| Open full editor | Row double click plus explicit menu/button. | Focus lands in editor route chrome or documented route heading. | DOM/route test. |
| Rename template/category | Context menu or visible action. | Dialog input has label; success/error announced without losing recovery path. | DOM test. |
| Move template | Drag/drop plus `Move to group` menu path. | Non-drag path remains available and labeled. | DOM interaction test. |
| Duplicate/delete template | Context menu or visible action. | Destructive confirmation returns focus to invoking row/action. | DOM test. |
| Insert template | Explicit insert button/menu path. | Resolver failure keeps picker open with error. | Insert-flow test; Playwright only if provider path changes. |
| Switch dock tabs | Tablist keyboard behavior. | `aria-controls`/tabpanel linkage stays valid; hidden tabs absent from tab order. | Visible-tabs DOM test. |
| Project selector | Keyboard-selectable project option or unavailable state. | Selected project changes source scope announcement; no blank tree. | Project-tab DOM test. |

## Attack Surface Inventory

| Entry point | Actor | Authn/authz and ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Template browse server seed | Authenticated workspace user | Existing workspace resolution and RLS/read policy. | No user-provided id besides session/workspace context. | `EstimateTemplate[]` limited to workspace templates. | Server timing labels; client query partitioned by user/workspace. | Normal app auth controls; no new public surface. | Cache partition tests. |
| Browse create/rename/duplicate/move/delete actions from `src/lib/component-library/actions` | Workspace editor/admin | Must continue checking workspace/editor authority server-side. | Trimmed names/categories, UUID ids, mutation-specific validation. | Template or status/error payload only. | Scoped query patch/invalidation; no broad refresh unless justified. | Existing action tests; new read-only UI tests. | Browse mutation tests. |
| Template editor server actions in `template-editor-actions.ts` | Workspace editor/admin; viewer attacker direct-calling actions | `requireCurrentUserContext`, `ensureDefaultWorkspace`, `is_workspace_editor`, template workspace match. | UUID checks, name trims, hierarchy checks, DB trigger backstop. | Narrow node/row ids or updated fields. | `revalidatePath` for browse and detail routes. | No new rate layer in conservative track; keep direct-call denial tests. | `template-editor-actions-authz.test.ts`. |
| Right dock Project source reads | Authenticated workspace user | Project list/source reads must be authorized to workspace/project. | Selected project id must be UUID and authorized. | Bounded project/source tree DTO only. | Query key includes selected project; resets on project change. | No eager bulk reads before intent. | Project-tab scope tests. |
| Insert template into estimate | Workspace editor/admin for target estimate | Existing insert RPC/action validates template and target estimate. | Template id and target estimate/node ids. | Insert result/status, no source mutation. | Existing invalidation/revalidation path. | No duplicate replay on back/forward or retry. | Insert picker/drop tests; e2e only when provider path changes. |

## Performance And Reliability Contract

- LCP/first paint posture: preserve stable route skeleton and do not block first paint on right-dock component/project source datasets.
- INP posture: source dock loads on pointer/focus/click intent; hidden tree branches must not render work while inactive.
- CLS posture: left rail, center, and right dock footprints use fixed responsive constraints so tab labels, loading text, and tree rows do not resize the shell.
- Route transition posture: use existing `authenticatedWorkshopTransition` evidence only as baseline; do not claim improved route performance unless `perf:measure-routes` or the relevant e2e route-transition harness is run.
- Reliability posture: optimistic browse mutations must roll back on failure and keep the recovery dialog/action available.

## Security/Authz Mini-Review

| Concern | Current evidence | Planned control | Required proof |
| --- | --- | --- | --- |
| Template editor direct mutation | `template-editor-actions.ts` calls `requireCurrentUserContext`, `ensureDefaultWorkspace`, `is_workspace_editor`, and workspace/template checks before mutations. | Preserve server-action denial; UI gating is only a usability layer. | `template-editor-actions-authz.test.ts`. |
| Viewer edit affordances | `[templateId]/page.tsx` currently passes only `template` and `workspaceId`; editor children currently receive mutating handlers. | Resolve `canEditTemplate` server-side and gate child action props/UI. | Editor viewer DOM tests. |
| Hidden `Templates` tab resurrection | `EstimateRightSidebar` currently restores stored/account `templates` active tab. | Clamp all active-tab sources and persistence writes against `visibleTabs`. | Visible-tabs tests with local/account preference fixtures. |
| Project source unauthorized read | Workspace Library route has no active project; client-selected project id is untrusted. | Server-side project list/detail actions verify workspace/project membership and return bounded DTOs. | Project-tab scope denial/empty tests. |
| Cache partitioning | Template query key is user/workspace-scoped when ids exist. | Project-source keys include user/workspace/project; no workspace-only cache for selected project data. | Cache partition tests. |

## Evidence-Class Contract

This planning pass can prove only local static planning quality. It cannot prove browser rendering, provider state, hosted behavior, production behavior, or WCAG conformance.

| Evidence class | Available in this pass | Cannot be claimed from it |
| --- | --- | --- |
| Local static | Plan docs, source reads, local Next docs, `git diff --check`. | Runtime UI behavior, provider state, hosted/prod status. |
| Local automated | Future targeted Vitest/type/lint commands in the implementation plan. | Provider/production truth unless connected to that environment. |
| Browser/manual | Skipped for this planning pass. | Visual fidelity, real focus, responsive drawer behavior. |
| Provider-backed | Skipped; no provider mutation in conservative plan. | Supabase readback or migration state. |
| Inferred | Used only for feasibility reasoning from current source. | Completion of implementation requirements. |
