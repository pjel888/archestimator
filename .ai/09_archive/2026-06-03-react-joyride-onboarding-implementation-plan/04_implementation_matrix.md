# 04 Implementation Matrix

## Purpose

This document defines exactly where, when, and how onboarding tours should be implemented across the Archestimator workspace. It serves as the single source of truth for implementation sequencing, trigger timing, persistence behavior, and risk assessment for every tour surface.

**DO NOT implement onboarding on any surface not listed in this matrix.** Public routes are explicitly excluded. Each surface entry maps a specific user objective to exact `data-tour` targets and source file changes.

---

## MVP Decision

**Recommended: Option C — A tour registry supporting route-scoped segments, implementing Workspace Orientation MVP first.**

### Justification

| Factor | Rationale |
|--------|-----------|
| **Registry pattern** | Supports sustainable growth. Future tours just add config entries — no runtime refactors needed. One `tourRegistry.ts`, one `OnboardingRuntime`, one persistence table. |
| **Workspace Orientation first** | Immediate value delivery. User understands the shell, nav, and destination cards before attempting any task. Lowest risk deployment: single route, no modals, zero dynamic imports, no Suspense boundaries. |
| **Route-scoped segments** | Each tour binds to a specific route. No cross-route state leakage. Tour lifecycle is self-contained within its route segment. |
| **Versioned keys** | `first_workspace_orientation_v1` — the `_v1` suffix means future redesigns (new shell, new nav) can ship `_v2` without migrating or resetting existing user completion state. |
| **Lowest risk first** | Workspace Orientation = single route, well-defined targets (MainSidebar + WorkshopHomebaseClient), no modal interaction, no dynamic imports. Proves the system before committing to complex tours. |

### What "Option C" means in practice

```
src/features/onboarding/
├── types/onboarding.ts              # Shared types
├── config/
│   ├── tourTargets.ts               # data-tour attribute constants (single source of truth)
│   ├── tourRegistry.ts              # Map<Route, Tour[]> lookup
│   ├── firstWorkspaceOrientationTour.ts
│   ├── firstProjectCreationTour.ts
│   ├── firstEstimateSheetTour.ts
│   └── componentLibraryIntroTour.ts
├── components/
│   ├── OnboardingRuntime.tsx        # Joyride wrapper, mounted in WorkshopPageShell
│   ├── OnboardingProvider.tsx       # Context (tour state, skip/complete)
│   └── OnboardingTooltip.tsx        # Design-system tooltip
├── hooks/
│   ├── useOnboardingState.ts        # Tour state fetch/update
│   ├── useOnboardingTourController.ts # Tour lifecycle (start, step, complete, skip)
│   └── useMountedTourTargets.ts     # Detect mounted data-tour targets
└── services/
    ├── onboardingPersistence.ts     # Supabase read/write (server actions wrapper)
    └── onboardingEvents.ts          # Future analytics hook (no-op initially)
```

---

## Implementation Matrix

### Legend

| Column | Meaning |
|--------|---------|
| **Surface/Route** | The exact URL path or component area where the tour step renders |
| **User Objective** | What the user should understand/do after this tour step |
| **Existing File/Component** | Verified source file(s) that render this surface |
| **Proposed Tour Key** | Versioned tour key string used in the registry |
| **Proposed data-tour Targets** | Exact `data-tour` attribute values to place on DOM elements |
| **Required Future Source Changes** | Concrete code changes needed (add props, add attributes, mount runtime) |
| **Why This Surface Matters** | Product rationale for including this surface |
| **Trigger Timing** | When and how this tour starts |
| **Persistence Behavior** | What gets persisted after completion/skip, and where |
| **Dependencies** | Other surfaces/components/tours that must exist first |
| **Risk Level** | Low / Medium / High — based on component complexity, dynamic imports, modal interactions |
| **MVP or Later** | Phase assignment |

---

### Tour Surfaces

#### 1. `/workshop` Homebase

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/workshop` (Workspace homebase / bento grid) |
| **User Objective** | Understand the workspace shell layout, main sidebar navigation, and destination cards (Projects, Library, Templates, Charts entry points) |
| **Existing File/Component** | `src/app/workshop/page.tsx` (server page), `src/components/workshop/WorkshopHomebaseClient.tsx` (client bento grid), `src/components/workshop/WorkshopPageShell.tsx` (shell wrapper) |
| **Proposed Tour Key** | `first_workspace_orientation_v1` |
| **Proposed data-tour Targets** | `ae-tour-workshop-shell` (WorkshopPageShell root div), `ae-tour-main-nav-workshop` (Workspace nav item), `ae-tour-main-nav-projects` (Projects nav item), `ae-tour-homebase-projects-card` (first DestinationTile on homebase), `ae-tour-homebase-library-card` (Library DestinationTile), `ae-tour-homebase-templates-card` (Templates DestinationTile) |
| **Required Future Source Changes** | 1. `WorkshopPageShell.tsx`: Add `data-tour="ae-tour-workshop-shell"` to shell root wrapper div. 2. `WorkshopPageShell.tsx`: Conditionally mount `<OnboardingRuntime>` (behind feature flag, lazy-loaded via `next/dynamic`). 3. `MainSidebar.tsx`: Add `data-tour` attributes to nav item wrappers (see surface #2). 4. `WorkshopHomebaseClient.tsx`: Add `data-tour` to each `DestinationTile` in the bento grid. |
| **Why This Surface Matters** | This is the user's first impression of the workspace. Without orientation, they see a bento grid of unknown cards and a sidebar of unknown nav items. This tour answers "What is this place and where do I go?" before they attempt any task. |
| **Trigger Timing** | After first login + Supabase session confirmed. Route-scoped to `/workshop`. Triggered by `useOnboardingTourController` detecting no existing `user_onboarding_tours` row for `first_workspace_orientation_v1`. Starts only when all `data-tour` targets are detected in the DOM. |
| **Persistence Behavior** | On tour completion (last step Next/Done): write `{tour_key: 'first_workspace_orientation_v1', version: 1, completed_at: now(), skipped: false}` to `user_onboarding_tours`. On Skip: write same row with `skipped: true`. RLS enforces user-scoped writes. |
| **Dependencies** | `OnboardingRuntime` mounted in `WorkshopPageShell`. `MainSidebar` targets must be present (surface #2). `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`. Supabase `user_onboarding_tours` table created. |
| **Risk Level** | **Low.** Single route, no modals, no dynamic imports, no Suspense. Joyride spotlight on static DOM elements. All targets are always mounted on `/workshop`. |
| **MVP or Later** | **MVP (Phase 3 — Runtime + Controller)** |

---

#### 2. MainSidebar (shared across `/workshop/*`)

| Column | Detail |
|--------|--------|
| **Surface/Route** | MainSidebar — present on all `/workshop/*` routes via `WorkshopPageShell` |
| **User Objective** | Understand the five primary navigation destinations: Workshop home, Projects, Components (Library), Templates, Settings |
| **Existing File/Component** | `src/components/sidebar/MainSidebar.tsx`, `src/components/sidebar/SidebarNavItemRow.tsx` (renders each nav item as an icon + label row) |
| **Proposed Tour Key** | Shared across tours (not a standalone tour). Used by `first_workspace_orientation_v1` (steps 2-3) and potentially `component_library_intro_v1`. |
| **Proposed data-tour Targets** | `ae-tour-main-nav-workshop`, `ae-tour-main-nav-projects`, `ae-tour-main-nav-components` (Library), `ae-tour-main-nav-templates`, `ae-tour-main-nav-settings` |
| **Required Future Source Changes** | 1. `SidebarNavItemRow.tsx`: Accept optional `tourTarget?: string` prop. Render `data-tour={tourTarget}` on the root `<li>` or `<button>` element when prop is provided. 2. `MainSidebar.tsx`: Map each nav item to its `data-tour` target constant from `tourTargets.ts` and pass as prop. Example: `<SidebarNavItemRow tourTarget="ae-tour-main-nav-workshop" ... />` |
| **Why This Surface Matters** | Primary navigation is the backbone of the workspace. Without understanding what each nav item does, the user cannot navigate purposefully. Every tour that involves navigation will reference these targets. |
| **Trigger Timing** | Part of Workspace Orientation tour (surface #1). Sidebar is always mounted when `WorkshopPageShell` is rendered. |
| **Persistence Behavior** | No independent persistence — sidebar steps are part of the enclosing tour's completion record. |
| **Dependencies** | `SidebarNavItemRow` must accept optional `tourTarget` prop (trivial additive change). |
| **Risk Level** | **Low.** Purely additive change to an existing component. The `tourTarget` prop is optional and renders no additional DOM when undefined. |
| **MVP or Later** | **MVP (Phase 2 — Target Markers)** |

---

#### 3. Projects List (`/workshop/projects`)

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/workshop/projects` (project listing page) |
| **User Objective** | Understand how to create a first project, find existing projects, and recognize project cards |
| **Existing File/Component** | `src/app/workshop/projects/page.tsx` (server page), `src/components/workshop/projects-page-client.tsx` (client wrapper: search bar, create button, view-mode toggle, TanStack table), `src/components/workshop/LiveProjectCard.tsx` (individual project card) |
| **Proposed Tour Key** | `first_project_creation_v1` (step 1-2 of multi-step project creation tour) |
| **Proposed data-tour Targets** | `ae-tour-projects-create` (create project button), `ae-tour-project-card-first` (first LiveProjectCard in the grid/table), `ae-tour-projects-search` (search input field) |
| **Required Future Source Changes** | 1. `projects-page-client.tsx`: Add `data-tour="ae-tour-projects-create"` to the "New Project" button. 2. `projects-page-client.tsx`: Add `data-tour="ae-tour-projects-search"` to the search `<input>`. 3. `LiveProjectCard.tsx`: Accept optional `tourTarget?: string` prop. Render `data-tour={tourTarget}` on the card wrapper. Pass `ae-tour-project-card-first` only to the first card in the list (via index check in the parent). |
| **Why This Surface Matters** | Creating the first project is the user's primary conversion action. Without guidance, they may not know what a "project" means or how to start one. This tour bridges "I understand the shell" to "I'm creating value." |
| **Trigger Timing** | After `first_workspace_orientation_v1` completion OR when user manually navigates to `/workshop/projects` for the first time (whichever comes first). Route-scoped to `/workshop/projects`. |
| **Persistence Behavior** | `user_onboarding_tours` row: `{tour_key: 'first_project_creation_v1', version: 1, ...}`. Tour continues into the NewProjectModal (surface #4) and project dashboard (surface #5). Completion is written only after the full multi-step tour finishes. |
| **Dependencies** | `MainSidebar` targets (surface #2). Workspace Orientation tour should be marked complete or skipped before this triggers. `NewProjectModal` targets (surface #4) must exist for seamless continuation. |
| **Risk Level** | **Low-Medium.** Route transition required (user navigates from `/workshop` to `/workshop/projects`). Joyride must handle route change gracefully. No modals involved at this step. |
| **MVP or Later** | **Phase 2 (follows MVP)** |

---

#### 4. New Project Modal

| Column | Detail |
|--------|--------|
| **Surface/Route** | New Project modal overlay (triggered from `/workshop/projects`) |
| **User Objective** | Successfully create a first project by understanding the name field, optional image upload, and submit action |
| **Existing File/Component** | `src/components/workshop/NewProjectModal.tsx` (modal shell: title, description, form wrapper, cancel/submit actions), `src/components/workshop/NewProjectForm.tsx` (form container, passes props), `src/components/workshop/NewProjectFormSections.tsx` (form fields: name input, image upload dropzone) |
| **Proposed Tour Key** | `first_project_creation_v1` (continues — steps 3-5 of multi-step tour) |
| **Proposed data-tour Targets** | `ae-tour-new-project-name` (project name text input), `ae-tour-new-project-image` (image upload dropzone), `ae-tour-new-project-submit` (submit/create button) |
| **Required Future Source Changes** | 1. `NewProjectFormSections.tsx`: Add `data-tour="ae-tour-new-project-name"` to the project name `<input>`. 2. `NewProjectFormSections.tsx`: Add `data-tour="ae-tour-new-project-image"` to the image upload dropzone wrapper. 3. `NewProjectModal.tsx`: Add `data-tour="ae-tour-new-project-submit"` to the submit button. |
| **Why This Surface Matters** | The modal is the user's first form interaction. They need to understand what "project name" means (is it a client name? a job address?) and that the image is optional. Without guidance, they may abandon the form or create a project with a confusing name. |
| **Trigger Timing** | When the New Project modal opens during the `first_project_creation_v1` tour. The tour step advances from surface #3 (clicking "New Project" button). Joyride must detect the modal opening and wait for targets to mount. |
| **Persistence Behavior** | Part of `first_project_creation_v1` tour record. No separate persistence. |
| **Dependencies** | `NewProjectModal` must be open and rendered. Joyride spotlight must not clip behind the modal backdrop. `react-joyride`'s `spotlightClicks` or `disableOverlayClose` may need configuration to prevent modal dismissal during tour. |
| **Risk Level** | **Medium.** Three specific risks: (1) Joyride spotlight + modal backdrop z-index stacking — the spotlight overlay must render above the modal backdrop but below the modal content. (2) Modal focus management — Joyride steals focus for tooltip, but modal typically traps focus. (3) If user dismisses modal during tour, the tour step loses its target. Mitigation: `spotlightClicks={false}` on modal steps, and `onDismiss` of modal during active tour marks that step as skipped and advances. |
| **MVP or Later** | **Phase 2 (follows MVP)** |

---

#### 5. Project Dashboard (`/workshop/projects/[projectId]`)

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/workshop/projects/[projectId]` (project dashboard after creation, or after navigating from projects list) |
| **User Objective** | Understand the project workspace layout: open estimate sheets, project details sidebar, and the relationship between a project and its estimates |
| **Existing File/Component** | `src/app/workshop/projects/[projectId]/layout.tsx` (project shell layout with sidebar + header), `src/components/workshop/ProjectDashboardClient.tsx` (client dashboard: project metadata, estimate sheet list, action buttons) |
| **Proposed Tour Key** | `first_project_creation_v1` (continues — final steps of multi-step tour) |
| **Proposed data-tour Targets** | `ae-tour-project-dashboard-open-estimates` (link/button to open estimates list), `ae-tour-project-dashboard-details` (project details/sidebar panel) |
| **Required Future Source Changes** | 1. `ProjectDashboardClient.tsx`: Add `data-tour="ae-tour-project-dashboard-open-estimates"` to the "Open Estimates" link/button element. 2. `ProjectDashboardClient.tsx` (or layout): Add `data-tour="ae-tour-project-dashboard-details"` to the project details sidebar/meta area. |
| **Why This Surface Matters** | After creating a project, the user lands on the dashboard and needs to know "What now?" The primary next action is opening estimate sheets. Without guidance, the user may not understand the project → estimates relationship. |
| **Trigger Timing** | After successful project creation (surface #4), after the NewProjectModal closes and the route transitions to `/workshop/projects/[newProjectId]`. The tour controller must detect the route change and continue the tour. |
| **Persistence Behavior** | `first_project_creation_v1` tour record is marked complete after this final step. |
| **Dependencies** | Project creation must succeed. Route must navigate. Joyride must survive route transitions (react-joyride does NOT auto-survive — the `OnboardingRuntime` must remount and resume at the correct step index via `stepIndex` prop and persisted state). |
| **Risk Level** | **Medium.** Post-modal navigation means the Joyride instance is torn down and rebuilt. Mitigation: `useOnboardingTourController` persists `currentStepIndex` in a Zustand store or React context, and `OnboardingRuntime` restores it on remount. Requires careful coordination between route transition and step resumption. |
| **MVP or Later** | **Phase 2 (follows MVP)** |

---

#### 6. Project Estimates List (`/workshop/projects/[projectId]/estimates`)

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/workshop/projects/[projectId]/estimates` (estimate sheets list for a specific project) |
| **User Objective** | Understand how to create a new estimate sheet and find existing estimate sheets for the current project |
| **Existing File/Component** | `src/app/workshop/projects/[projectId]/estimates/page.tsx` (server page), `src/components/workshop/ProjectEstimatesClient.tsx` (client wrapper: search, create button), `src/components/workshop/ProjectEstimatesTable.tsx` (TanStack table with estimate rows) |
| **Proposed Tour Key** | `first_estimate_sheet_v1` (steps 1-2) |
| **Proposed data-tour Targets** | `ae-tour-estimates-create` (create estimate button), `ae-tour-estimates-table` (first estimate table row) |
| **Required Future Source Changes** | 1. `ProjectEstimatesClient.tsx`: Add `data-tour="ae-tour-estimates-create"` to the create estimate button. 2. `ProjectEstimatesTable.tsx`: Add `data-tour="ae-tour-estimates-table"` to the first `<tr>` in the TanStack table. |
| **Why This Surface Matters** | The estimates list is the gateway to the core estimating workflow. Without understanding what an "estimate sheet" is and how to create one, the user stalls at the project dashboard. |
| **Trigger Timing** | After `first_project_creation_v1` completion, when user navigates to `/workshop/projects/[projectId]/estimates`. Route-scoped trigger. |
| **Persistence Behavior** | `user_onboarding_tours` row: `{tour_key: 'first_estimate_sheet_v1', version: 1, ...}`. Continues into estimate sheet editor (surface #7). |
| **Dependencies** | Project must exist. `ProjectEstimatesTable` must render at least one row (or the tour handles the empty state gracefully — show "Create your first estimate" step). `first_project_creation_v1` should be complete. |
| **Risk Level** | **Low.** No modals. Static DOM targets. Table always renders. |
| **MVP or Later** | **Phase 3** |

---

#### 7. Estimate Sheet Editor (`/workshop/projects/[projectId]/estimates/[nodeId]`)

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/workshop/projects/[projectId]/estimates/[nodeId]` (estimate sheet editor: tree panel + content grid + right sidebar) |
| **User Objective** | Understand the tree + grid layout, how to add groups/areas, how the estimate sheet table works, where the component library sidebar is, and how to export |
| **Existing File/Component** | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` (server page), `src/components/workshop/EstimateWorkspaceClient.tsx` (dynamic import wrapper — `next/dynamic`), `src/components/workshop/EstimateSheetTree.tsx` (left panel: React Complex Tree), `src/components/workshop/EstimateSheetContent.tsx` (center: estimate sheet table + right sidebar toggle) |
| **Proposed Tour Key** | `first_estimate_sheet_v1` (continues — steps 3-8) |
| **Proposed data-tour Targets** | `ae-tour-estimate-tree` (tree panel root), `ae-tour-estimate-add-group` (add group button in tree), `ae-tour-estimate-add-area` (add area button in tree), `ae-tour-estimate-sheet-table` (estimate sheet table/grid area), `ae-tour-estimate-component-library` (component library sidebar toggle/panel), `ae-tour-estimate-export` (export/proposal button) |
| **Required Future Source Changes** | 1. `EstimateSheetTree.tsx`: Add `data-tour` attributes to tree root wrapper, add-group button, add-area button. 2. `EstimateSheetContent.tsx`: Add `data-tour="ae-tour-estimate-sheet-table"` to the table container. 3. `EstimateSheetContent.tsx`: Add `data-tour="ae-tour-estimate-component-library"` to the right sidebar toggle button. 4. `EstimateSheetContent.tsx`: Add `data-tour="ae-tour-estimate-export"` to the export/xlsx button. |
| **Why This Surface Matters** | This is the most complex and highest-value UI in the app. The tree + grid + sidebar layout is non-obvious to first-time users. Without a tour, users may not discover the component library sidebar, the export feature, or the tree hierarchy controls. This is the "aha moment" surface — where value is created. |
| **Trigger Timing** | After viewing estimates list (surface #6), when user navigates to a specific estimate node. Route-scoped trigger. Tour controller waits for `EstimateWorkspaceClient` to finish dynamic import and for all tree/grid targets to mount. |
| **Persistence Behavior** | `first_estimate_sheet_v1` tour record is marked complete after the final step. |
| **Dependencies** | `EstimateWorkspaceClient` must be loaded (dynamic import complete). React Complex Tree must be rendered and interactive. All `data-tour` targets must be in the DOM. `first_estimate_sheet_v1` prior steps must be complete. |
| **Risk Level** | **Medium-High.** Three specific risks: (1) `EstimateWorkspaceClient` uses `next/dynamic` with `ssr: false` — Joyride must wait for the dynamic import to resolve before starting steps. (2) React Complex Tree renders deeply nested DOM — `data-tour` attribute placement must be on stable, non-virtualized elements. (3) Suspense boundaries inside the editor may delay target mount. Mitigation: `useMountedTourTargets` hook polls for all required targets before advancing steps. Use `spotlightClicks={false}` and `disableScrolling={true}` on steps inside the complex tree panel. |
| **MVP or Later** | **Phase 3** |

---

#### 8. Estimate Tree Panel (sub-surface of #7)

| Column | Detail |
|--------|--------|
| **Surface/Route** | Left panel of estimate sheet editor (within `/workshop/projects/[projectId]/estimates/[nodeId]`) |
| **User Objective** | Understand the hierarchical tree structure (Groups contain Areas), how to add new nodes, and how the tree relates to the estimate grid |
| **Existing File/Component** | `src/components/workshop/EstimateSheetTree.tsx` (React Complex Tree with context menus, DnD, add-node buttons) |
| **Proposed Tour Key** | Part of `first_estimate_sheet_v1` |
| **Proposed data-tour Targets** | `ae-tour-estimate-tree` (tree container), `ae-tour-estimate-add-group` (add group button), `ae-tour-estimate-add-area` (add area button) |
| **Required Future Source Changes** | `EstimateSheetTree.tsx`: Add `data-tour` attributes to tree container div, add-group button, add-area button. Because React Complex Tree manages its own DOM, `data-tour` must be on containers that are NOT inside the tree's virtualized rendering — place them on the panel wrapper and the toolbar/header area above the tree. |
| **Why This Surface Matters** | The tree is the structural backbone of an estimate. Without understanding Groups vs Areas, users create flat, unstructured estimates. |
| **Trigger Timing** | Within the `first_estimate_sheet_v1` tour, after the general editor layout step (surface #7, step 3). |
| **Persistence Behavior** | Part of `first_estimate_sheet_v1`. |
| **Dependencies** | React Complex Tree must be rendered. Targets must be on stable container elements, not on virtualized tree item DOM nodes (which may unmount/remount during scrolling). |
| **Risk Level** | **Medium.** React Complex Tree's DOM is partially virtualized. `data-tour` placement must avoid virtualized list items. Instead, use the panel header/toolbar and the tree container wrapper, not individual tree nodes. |
| **MVP or Later** | **Phase 3** |

---

#### 9. Estimate Sheet Table (sub-surface of #7)

| Column | Detail |
|--------|--------|
| **Surface/Route** | Center panel of estimate sheet editor (within `/workshop/projects/[projectId]/estimates/[nodeId]`) |
| **User Objective** | Understand the estimate table layout: columns (item, description, quantity, unit, unit cost, total), how to edit rows inline, and how the table relates to the tree |
| **Existing File/Component** | `src/components/workshop/EstimateSheetContent.tsx` (contains the estimate table/grid rendered inside the content area) |
| **Proposed Tour Key** | Part of `first_estimate_sheet_v1` |
| **Proposed data-tour Targets** | `ae-tour-estimate-sheet-table` (table wrapper/container) |
| **Required Future Source Changes** | `EstimateSheetContent.tsx`: Add `data-tour="ae-tour-estimate-sheet-table"` to the table container div. |
| **Why This Surface Matters** | The estimate table is where the actual line-item work happens. Understanding the column layout and inline editing behavior is critical to the core workflow. |
| **Trigger Timing** | Within `first_estimate_sheet_v1`, after the tree panel step. |
| **Persistence Behavior** | Part of `first_estimate_sheet_v1`. |
| **Dependencies** | Estimate sheet must have at least one row rendered, OR the tour handles the empty state. Dynamic component may have loading states. |
| **Risk Level** | **Medium.** `EstimateSheetContent` is part of a dynamic import component. The table may be in a loading state. `useMountedTourTargets` must detect when the table is fully rendered. When the estimate has no rows, the tour step should explain "this is where your items will appear" rather than targeting a specific row. |
| **MVP or Later** | **Phase 3** |

---

#### 10. Component Right Sidebar (sub-surface of #7)

| Column | Detail |
|--------|--------|
| **Surface/Route** | Right panel of estimate sheet editor (toggleable component library sidebar) |
| **User Objective** | Understand how to open the component library sidebar and insert reusable cost components into the estimate |
| **Existing File/Component** | `src/components/workshop/EstimateSheetContent.tsx` (right sidebar toggled via button, renders `EstimateRightSidebar` or equivalent component library browser) |
| **Proposed Tour Key** | Part of `first_estimate_sheet_v1` |
| **Proposed data-tour Targets** | `ae-tour-estimate-component-library` (sidebar toggle button, OR the sidebar panel itself when open) |
| **Required Future Source Changes** | `EstimateSheetContent.tsx`: Add `data-tour="ae-tour-estimate-component-library"` to the sidebar toggle button. |
| **Why This Surface Matters** | The component library is a key productivity feature. Users who don't discover it waste time re-entering the same line items manually. |
| **Trigger Timing** | Within `first_estimate_sheet_v1`, after the table step. The tour step should instruct the user to click the toggle to open the sidebar, then the next step highlights the sidebar contents. |
| **Persistence Behavior** | Part of `first_estimate_sheet_v1`. |
| **Dependencies** | Sidebar toggle button must be visible. When sidebar is closed, the tour targets the toggle button. When open, it targets the sidebar panel. Joyride must handle the state change — the step that says "click to open" targets the button; the next step targets the now-open sidebar contents. |
| **Risk Level** | **Medium.** State-dependent target: closed (button only) vs open (panel + contents). Joyride must advance steps after the user clicks the toggle, detecting the sidebar-open state before highlighting its contents. |
| **MVP or Later** | **Phase 3** |

---

#### 11. Component Library Page (`/workshop/library`)

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/workshop/library` (global component library page) |
| **User Objective** | Understand how to browse, search, and create reusable cost components in the global library |
| **Existing File/Component** | `src/app/workshop/library/page.tsx` (server page), `src/components/workshop/LibraryPageClient.tsx` (dynamic import → `ComponentLibraryManager`), `src/components/workshop/component-library-manager/` (component tree, grid, command palette) |
| **Proposed Tour Key** | `component_library_intro_v1` |
| **Proposed data-tour Targets** | `ae-tour-library-add-component` (add component button), `ae-tour-library-folder-tree` (folder/organization tree), `ae-tour-library-component-grid` (component card grid) |
| **Required Future Source Changes** | `LibraryPageClient.tsx` (or the component it wraps): Add `data-tour` attributes to add-component button, folder tree container, and component grid container. |
| **Why This Surface Matters** | The component library is the reusable foundation for estimates. Power users build their library as a knowledge base. New users need to understand how to add their first component and organize it in folders. |
| **Trigger Timing** | After `first_estimate_sheet_v1` completion. Route-scoped to `/workshop/library`. User may arrive via MainSidebar "Components" nav or after seeing the sidebar in the estimate editor. |
| **Persistence Behavior** | `user_onboarding_tours` row: `{tour_key: 'component_library_intro_v1', version: 1, ...}` |
| **Dependencies** | `LibraryPageClient` dynamic import must resolve. Component library tree and grid must be rendered. `MainSidebar` target `ae-tour-main-nav-components` exists. |
| **Risk Level** | **Medium.** Dynamic import (`next/dynamic`). The library page has a complex tree + grid layout similar to the estimate editor. Similar target-detection patience required. |
| **MVP or Later** | **Phase 4** |

---

#### 12. Settings / Help Replay Entry

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/workshop/settings` (Settings hub) and/or `/workshop/settings/profile` (Profile page) |
| **User Objective** | Replay any previously completed or skipped onboarding tour |
| **Existing File/Component** | `src/app/workshop/settings/page.tsx` (settings hub), `src/app/workshop/settings/profile/page.tsx` (profile settings), `src/components/sidebar/MainSidebar.tsx` (settings nav item, sidebar footer area) |
| **Proposed Tour Key** | N/A — this is a replay mechanism, not a tour. |
| **Proposed data-tour Targets** | No new `data-tour` targets. This is a UI element (button, menu item, card) that triggers replay. |
| **Required Future Source Changes** | 1. Create `OnboardingReplayMenuItem` component (in `src/features/onboarding/components/`). 2. Add it to Settings hub page (`src/app/workshop/settings/page.tsx`) as a settings card: "Replay Onboarding Tours" with a dropdown/selector of available tours. 3. Alternative placement: Add to sidebar footer area or profile page. 4. On click: the component calls `onboardingPersistence.resetTour(tourKey)` to delete the completion row, then navigates to the tour's route so it triggers naturally. |
| **Why This Surface Matters** | Replay is a user trust feature. Users who skipped a tour or want to revisit after learning more can self-serve. Without replay, the only way to re-trigger a tour is a database reset. |
| **Trigger Timing** | User-initiated. No automatic trigger. The replay button is always visible in Settings. |
| **Persistence Behavior** | Replay action deletes the `user_onboarding_tours` row for the selected tour key. On next navigation to the tour's route, `useOnboardingTourController` sees no completion row and triggers the tour again. |
| **Dependencies** | `onboardingPersistence.resetTour()` server action. Settings page must be routed and accessible. |
| **Risk Level** | **Low.** Additive UI. No tour orchestration complexity. Simple server-action call + navigation. |
| **MVP or Later** | **Phase 5 (UX Polish)** |

---

#### 13. Public Routes — EXCLUDED (MVP Guardrail)

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/share/[token]`, `/invite/[token]`, `/auth/callback` |
| **User Objective** | N/A — no onboarding on public routes. |
| **Existing File/Component** | All public pages use `PublicPageShell` or no shell. None mount `WorkshopPageShell`. |
| **Proposed Tour Key** | N/A |
| **Proposed data-tour Targets** | NONE. Do NOT add `data-tour` attributes to any public-route component. |
| **Required Future Source Changes** | NONE. Zero changes to any public-route file. |
| **Why This Surface Matters** | Onboarding is an authenticated-workspace concern. Public routes serve unauthenticated visitors (landing, pricing, legal) and auth flows (login, invite). Onboarding code must never bundle into these routes. The `WorkshopPageShell` gate ensures this. |
| **Trigger Timing** | N/A |
| **Persistence Behavior** | N/A |
| **Dependencies** | None. This is an exclusion gate, not an implementation target. |
| **Risk Level** | **None** (exclusion — no code touches these routes). |
| **MVP or Later** | **MVP guardrail — enforced from Phase 1** |

---

#### 14. Share Routes — EXCLUDED (MVP Guardrail)

| Column | Detail |
|--------|--------|
| **Surface/Route** | `/share/[token]`, `/api/share/[token]` |
| **User Objective** | N/A — no onboarding on share routes. Share routes serve external clients viewing published estimates, not authenticated workspace users. |
| **Existing File/Component** | `src/app/share/[token]/page.tsx` (public shared link viewer), `src/app/api/share/[token]/route.ts` (publication API) |
| **Proposed Tour Key** | N/A |
| **Proposed data-tour Targets** | NONE. |
| **Required Future Source Changes** | NONE. |
| **Why This Surface Matters** | Share routes have their own auth model (token-based, optional password, public access). Onboarding code would bloat the share viewer bundle for external users who will never see a workshop tour. |
| **Trigger Timing** | N/A |
| **Persistence Behavior** | N/A |
| **Dependencies** | None. |
| **Risk Level** | **None.** |
| **MVP or Later** | **MVP guardrail.** |

---

### Summary

| Phase | Tours | Surfaces | Risk Level | Key Deliverable |
|-------|-------|----------|------------|-----------------|
| **MVP (Phase 1-2)** | Workspace Orientation (`first_workspace_orientation_v1`) | Surfaces 1, 2 | Low | `src/features/onboarding/` skeleton, `data-tour` targets on MainSidebar and WorkshopHomebaseClient. Tour: 4-6 steps, single route, no modals, no dynamic imports. |
| **Phase 2** | Project Creation (`first_project_creation_v1`) | Surfaces 3, 4, 5 | Low-Medium | Multi-step tour across routes: projects list → NewProjectModal → project dashboard. Modal spotlight management. Route transition handling. |
| **Phase 3** | Estimate Sheet (`first_estimate_sheet_v1`) | Surfaces 6, 7, 8, 9, 10 | Medium-High | Tour across estimates list → estimate editor. Dynamic import waiting. React Complex Tree target placement. State-dependent sidebar targets. |
| **Phase 4** | Component Library (`component_library_intro_v1`) | Surface 11 | Medium | Library page tour. Dynamic import waiting. Folder tree + grid layout orientation. |
| **Phase 5** | Replay + UX Polish | Surface 12 | Low | `OnboardingReplayMenuItem` in Settings. Custom tooltip styling. Accessibility audit. Skip/dismiss behavior polish. |
| **MVP Guardrail** | Excluded public + share routes | Surfaces 13, 14 | None | Zero changes to public routes. `WorkshopPageShell` gate enforces isolation. |

### Phase-to-Surface Mapping

```
MVP (Phase 1-3):  Surfaces 1, 2
Phase 2:           Surfaces 3, 4, 5
Phase 3:           Surfaces 6, 7, 8, 9, 10
Phase 4:           Surface 11
Phase 5:           Surface 12
Guardrail:         Surfaces 13, 14 (permanent exclusion)
```

### Trigger Flow

```
User signs up / logs in
        │
        ▼
WorkshopPageShell renders
        │
        ▼
OnboardingRuntime mounts (feature flag check)
        │
        ▼
useOnboardingTourController checks user_onboarding_tours table
        │
        ├── Row exists for first_workspace_orientation_v1? → Skip tour
        │
        └── No row? → Start first_workspace_orientation_v1
                │
                ├── Wait for all data-tour targets mounted (useMountedTourTargets)
                │
                ├── Tour completes / user skips → Persist to user_onboarding_tours
                │
                ├── User navigates to /workshop/projects?
                │       └── Check first_project_creation_v1 row → Start project creation tour
                │
                └── User navigates to /workshop/projects/[id]/estimates?
                        └── Check first_estimate_sheet_v1 row → Start estimate sheet tour
```

### Exclusion Verification (Pre-Implementation Checklist)

Before any implementation phase, verify:

- [ ] `grep -r "data-tour" src/app/\(page\|about\|features\|pricing\|contact\|privacy\|terms\|login\|share\|invite\|auth\)/` returns ZERO results
- [ ] `grep -r "OnboardingRuntime\|OnboardingProvider\|react-joyride" src/app/\(page\|about\|features\|pricing\|contact\|privacy\|terms\|login\|share\|invite\|auth\)/` returns ZERO results
- [ ] `grep -r "from.*onboarding" src/app/\(page\|about\|features\|pricing\|contact\|privacy\|terms\|login\|share\|invite\|auth\)/` returns ZERO results
- [ ] Bundle analysis confirms zero onboarding code in public-route chunks
- [ ] `WorkshopPageShell` is the ONLY mount point for `OnboardingRuntime`
