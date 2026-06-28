# Requirements Traceability Matrix

| Requirement | Source Evidence | Planned Work | Verification |
| --- | --- | --- | --- |
| REQ-001 Preserve Library IA | `src/app/workshop/library/layout.tsx`, `LibraryTabsLayoutClient.tsx` | Keep browse under Library layout; detail route may hide parent tabs. | `library-tabs-layout.test.tsx` |
| REQ-002 Explicit browse/edit identity | Current-state notes; `[templateId]/page.tsx`; `TemplatesBrowseManager.tsx` | Conservative track keeps full editing in `[templateId]`. | `template-editor.test.tsx`, `template-gallery.test.tsx` |
| REQ-003 Workspace grammar | `EstimateWorkspaceClient.tsx`, DESIGN.md workspace section | Three-zone template workbench. | DOM layout assertions; design QA gate |
| REQ-004 Template inventory left rail | `TemplatesBrowseManager.tsx` tree model | Keep/adapt template categories and rows in left rail. | `template-gallery.test.tsx`, new workbench tests |
| REQ-005 No Templates dock tab | `component-library/index.tsx` hardcoded tabs | Add `visibleTabs` and clamp state. | `estimate-right-sidebar-visible-tabs.test.tsx` |
| REQ-006 Library + Project tabs | Current right dock project tab assumptions; user target result | Render exactly `Library` and `Project`; Project means reusable estimate sources from selected authorized projects, with selector/unavailable state before scoped data. | project-tab scope tests |
| REQ-007 Center dominance | DESIGN.md proportions | Bound dock width, preserve flexible center. | DOM layout/static assertions; optional visual QA |
| REQ-008 Capability gating | `template-editor-actions.ts` server authz; editor route lacks prop | Add `canEditTemplate` prop and UI gating. | `template-editor.test.tsx`, `template-editor-actions-authz.test.ts` |
| REQ-009 Snapshot copy semantics | decisions.md and template insert RPC/action records | Do not mutate source templates during insert. | existing insert/drop tests |
| REQ-010 Lazy dock data | `TemplateEditorClient.tsx` `dockRequested` query | Preserve intent-gated load. | perf render test; query tests |
| REQ-011 Project-source ambiguity | Current route has workspace, not project context | Required visible Project tab with selector/unavailable state and scoped data after selection. | new project-tab test |
| REQ-012 Keyboard equivalents | Current tree/menu patterns | Preserve and extend non-drag actions. | DOM interaction tests |
| REQ-013 Route transition performance | route transition scripts/tests | Extend only if navigation changes. | route-transition tests/scripts |
| REQ-014 Cache partitioning | `workspaceEstimateTemplatesQueryKey` | Preserve user/workspace/project keys. | `library-templates-cache.test.tsx` |
| REQ-015 Mobile policy | DESIGN.md responsiveness; estimate desktop notice | Add desktop notice, drawers, or read-only fallback. | DOM/mobile test or gated browser if drawer behavior changes |
| REQ-016 Keep implementation extractable | existing giant-component comments | Extract helper/state seams rather than inline branching. | code review and targeted tests |

## Implementation Unit Traceability

| Unit | Requirements | Primary files | Proof rows | Status |
| --- | --- | --- | --- | --- |
| U0 Characterization | REQ-001, REQ-002, REQ-005, REQ-006, REQ-014 | tests under `tests/vitest` | PROOF-001, PROOF-008 | Planned |
| U1 Configurable right dock tabs | REQ-005, REQ-006, REQ-010, REQ-014, REQ-016 | `component-library/index.tsx`, right-sidebar state hook | PROOF-002, PROOF-003 | Planned |
| U2 Template workbench browse route | REQ-001, REQ-003, REQ-004, REQ-006, REQ-007, REQ-010, REQ-011, REQ-012, REQ-013, REQ-015, REQ-016 | `TemplatesBrowse*`, selected-template center, source dock host | PROOF-004, PROOF-005, PROOF-007, PROOF-008 | Planned |
| U3 Template editor capability hardening | REQ-002, REQ-008, REQ-009, REQ-012 | `[templateId]/page.tsx`, `TemplateEditorClient`, editor actions/tests | PROOF-006, PROOF-007 | Planned |
| U4 Performance/a11y/route guard | REQ-007, REQ-010, REQ-012, REQ-013, REQ-015 | DOM/perf/e2e tests as gated | PROOF-003, PROOF-004, PROOF-007, PROOF-008 | Planned |

## Shadow Path Matrix

| User Path | Required Result | Tests |
| --- | --- | --- |
| Open `/workshop/library/templates` cold. | Stable workspace skeleton, left rail, center state, no hidden dock fetch. | workbench transition + cache tests |
| Select category. | Center scopes templates; left selection state is truthful. | workbench transition tests |
| Select template. | Center selected-template surface appears; source dock can be requested; right dock tabs are exactly Library and Project. | workbench + visible-tabs tests |
| Open full editor. | Navigates to `[templateId]`; Library parent tabs hidden; editor chrome appears. | `library-tabs-layout.test.tsx`, `template-editor.test.tsx` |
| Viewer opens editor. | Read-only UI; server mutation denied if called directly. | editor UI + authz tests |
| Stored active tab is Templates. | Template-focused dock opens on Library or valid fallback. | visible-tabs tests |
| Mobile opens route. | No squeezed three-pane editor. | DOM/mobile or gated browser depending implementation |

## Failure/Attack Shadow Matrix

| Flow | Missing/nil input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Project selector/source load | No workspace/project scope | No authorized projects | Tampered/non-UUID project id | Project not in workspace or not readable | Project-source action rejects/times out | Selected project changes before old load returns | Retry selected project load | Selector/unavailable/error state; no blank tree or leaked data | Project-tab scope tests |
| Visible right-dock tabs | `visibleTabs` absent | `visibleTabs=[]` should be rejected/fallback in implementation | Stored active tab not in visible list | N/A | Account prefs load fails | Visible tabs prop changes after mount | Pref persistence after clamp | Active visible fallback; no hidden `Templates` render | Visible-tabs tests |
| Template editor capability | `canEditTemplate` false/missing | Viewer has no editable actions | Client calls hidden action directly | `is_workspace_editor` denies | Server action fails | Local optimistic state stale after denial | Retry after failure | Read-only UI or recoverable error | Editor UI + authz tests |
