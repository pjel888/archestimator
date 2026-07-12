# 07 Tour Registry and Targeting Plan

**Status:** Planning
**Created:** 2026-06-03
**Route/surface:** `/workshop/*` authenticated surfaces behind `WorkshopPageShell`

Defines the centralized tour key naming convention, `data-tour` target attribute system, route-scoped tour registration, and component implementation patterns for ArchEstimator's React Joyride onboarding system.

---

## Centralized Tour Key Naming

All tour keys are defined in a single TypeScript const object. This ensures compile-time uniqueness, prevents typos, and makes every tour key searchable via `grep` and `lsp_find_references`.

**File:** `src/features/onboarding/config/tourKeys.ts`

```typescript
export const TOUR_KEYS = {
  /** First workspace visit — shell, nav, homebase orientation. Route: /workshop */
  WORKSPACE_ORIENTATION_V1: 'first_workspace_orientation_v1',
  /** First project creation flow. Route: /workshop/projects. Prereq: WORKSPACE_ORIENTATION_V1 */
  PROJECT_CREATION_V1: 'first_project_creation_v1',
  /** First estimate sheet interaction. Route: /workshop/projects/[projectId]/estimates/[nodeId] */
  ESTIMATE_SHEET_V1: 'first_estimate_sheet_v1',
  /** Component library introduction. Route: /workshop/library */
  COMPONENT_LIBRARY_INTRO_V1: 'component_library_intro_v1',
} as const;

export type TourKey = (typeof TOUR_KEYS)[keyof typeof TOUR_KEYS];
```

**Naming convention:** `{purpose}_{version}` where purpose is descriptive, lowercase, underscores, and version is `v1`, `v2`, etc. Example: `first_workspace_orientation_v1`. The `v1` suffix enables versioning — when step content or order changes significantly, bump to `_v2`.

---

## Centralized `data-tour` Target Constants

All `data-tour` attribute values are defined in a single TypeScript const object. This enforces uniqueness, enables compile-time reference checking (if a component references `TOUR_TARGETS.MISSING_CONSTANT`, TypeScript fails), and makes every target discoverable.

**File:** `src/features/onboarding/config/tourTargets.ts`

```typescript
/**
 * data-tour attribute values for React Joyride step targeting.
 * Every value is a valid HTML data attribute value — lowercase, hyphens, no spaces.
 * Prefix: "ae-tour-" for Archestimator tour namespace.
 * Format: ae-tour-{surface}-{element}
 *
 * NEVER duplicate a value. TypeScript `as const` prevents overlap at compile time.
 */

export const TOUR_TARGETS = {
  // =========================================================================
  // Workspace Shell & Navigation (MVP — Phase 2-3)
  // =========================================================================

  /** Full workspace shell outer container.
   *  Owned by: src/components/workshop/WorkshopPageShell.tsx (main element at line 86)
   *  Route: /workshop
   */
  WORKSPACE_SHELL: 'ae-tour-workspace-shell',

  /** Main nav: Workshop (homebase) sidebar item.
   *  Owned by: src/components/sidebar/MainSidebar.tsx (dashboardItem, id="workshop")
   *  Route: /workshop (persistent across all workshop routes)
   */
  MAIN_NAV_WORKSPACE: 'ae-tour-main-nav-workspace',

  /** Main nav: Projects sidebar item.
   *  Owned by: src/components/sidebar/MainSidebar.tsx (sidebarNavItems[1], id="projects")
   *  Route: /workshop (persistent across all workshop routes)
   */
  MAIN_NAV_PROJECTS: 'ae-tour-main-nav-projects',

  /** Main nav: Components (library) sidebar item.
   *  Owned by: src/components/sidebar/MainSidebar.tsx (sidebarNavItems[2], id="library")
   *  Route: /workshop (persistent across all workshop routes)
   */
  MAIN_NAV_COMPONENTS: 'ae-tour-main-nav-components',

  /** Main nav: Templates sidebar item.
   *  Owned by: src/components/sidebar/MainSidebar.tsx (sidebarNavItems[3], id="templates")
   *  Route: /workshop (persistent across all workshop routes)
   */
  MAIN_NAV_TEMPLATES: 'ae-tour-main-nav-templates',

  /** Main nav: Settings sidebar item.
   *  Owned by: src/components/sidebar/MainSidebar.tsx (sidebarNavItems[4], id="settings")
   *  Route: /workshop (persistent across all workshop routes)
   */
  MAIN_NAV_SETTINGS: 'ae-tour-main-nav-settings',

  // =========================================================================
  // Homebase Dashboard (MVP — Phase 2-3)
  // =========================================================================

  /** Homebase Projects shortcut card (bento grid).
   *  Owned by: src/components/workshop/WorkshopHomebaseClient.tsx
   *  Route: /workshop
   */
  HOMEBASE_PROJECTS_CARD: 'ae-tour-homebase-projects-card',

  /** Homebase Components shortcut card (bento grid).
   *  Owned by: src/components/workshop/WorkshopHomebaseClient.tsx
   *  Route: /workshop
   */
  HOMEBASE_COMPONENTS_CARD: 'ae-tour-homebase-components-card',

  /** Homebase Templates shortcut card (bento grid).
   *  Owned by: src/components/workshop/WorkshopHomebaseClient.tsx
   *  Route: /workshop
   */
  HOMEBASE_TEMPLATES_CARD: 'ae-tour-homebase-templates-card',

  // =========================================================================
  // Projects List (Phase 4 — post-MVP)
  // =========================================================================

  /** Search/filter input on projects list page.
   *  Owned by: src/components/workshop/projects-page-client.tsx
   *  Route: /workshop/projects
   */
  PROJECTS_SEARCH: 'ae-tour-projects-search',

  /** "Create project" / "New project" button in projects list toolbar.
   *  Owned by: src/components/workshop/projects-page-client.tsx (projectToolbarActions)
   *  Route: /workshop/projects
   */
  PROJECTS_CREATE: 'ae-tour-projects-create',

  /** First project card in the list (used as example).
   *  Owned by: src/components/workshop/projects-page-client.tsx (LiveProjectCard / ProjectCard)
   *  Route: /workshop/projects
   */
  PROJECT_CARD_FIRST: 'ae-tour-project-card-first',

  // =========================================================================
  // New Project Modal (Phase 4 — post-MVP)
  // =========================================================================

  /** Project name input inside NewProjectModal.
   *  Owned by: src/components/workshop/NewProjectModal.tsx
   *  Route: /workshop/projects (modal overlay)
   */
  NEW_PROJECT_NAME: 'ae-tour-new-project-name',

  /** Project cover image upload inside NewProjectModal.
   *  Owned by: src/components/workshop/NewProjectModal.tsx
   *  Route: /workshop/projects (modal overlay)
   */
  NEW_PROJECT_IMAGE: 'ae-tour-new-project-image',

  /** Submit/create button inside NewProjectModal.
   *  Owned by: src/components/workshop/NewProjectModal.tsx
   *  Route: /workshop/projects (modal overlay)
   */
  NEW_PROJECT_SUBMIT: 'ae-tour-new-project-submit',

  // =========================================================================
  // Project Dashboard (Phase 4 — post-MVP)
  // =========================================================================

  /** Open Estimates link/card on project dashboard.
   *  Owned by: src/app/workshop/projects/[projectId]/layout.tsx (project dashboard shell)
   *  Route: /workshop/projects/[projectId]
   */
  PROJECT_DASHBOARD_OPEN_ESTIMATES: 'ae-tour-project-dashboard-open-estimates',

  /** Project details panel/section on project dashboard.
   *  Owned by: src/app/workshop/projects/[projectId]/layout.tsx (project dashboard shell)
   *  Route: /workshop/projects/[projectId]
   */
  PROJECT_DASHBOARD_DETAILS: 'ae-tour-project-dashboard-details',

  // =========================================================================
  // Estimates List (Phase 5 — future)
  // =========================================================================

  /** Create new estimate button in estimates list.
   *  Owned by: src/components/workshop/ProjectEstimatesClient.tsx
   *  Route: /workshop/projects/[projectId]/estimates
   */
  ESTIMATES_CREATE: 'ae-tour-estimates-create',

  /** Estimates table/list view.
   *  Owned by: src/components/workshop/ProjectEstimatesClient.tsx
   *  Route: /workshop/projects/[projectId]/estimates
   */
  ESTIMATES_TABLE: 'ae-tour-estimates-table',

  // =========================================================================
  // Estimate Editor (Phase 5 — future)
  // =========================================================================

  /** Estimate tree panel (group/area hierarchy).
   *  Owned by: src/components/workshop/EstimateSheetTree.tsx
   *  Route: /workshop/projects/[projectId]/estimates/[nodeId]
   */
  ESTIMATE_TREE: 'ae-tour-estimate-tree',

  /** Add Group button on estimate tree toolbar.
   *  Owned by: src/components/workshop/EstimateSheetTree.tsx (via HeaderIconToolbar)
   *  Route: /workshop/projects/[projectId]/estimates/[nodeId]
   */
  ESTIMATE_ADD_GROUP: 'ae-tour-estimate-add-group',

  /** Add Area button on estimate tree toolbar.
   *  Owned by: src/components/workshop/EstimateSheetTree.tsx (via HeaderIconToolbar)
   *  Route: /workshop/projects/[projectId]/estimates/[nodeId]
   */
  ESTIMATE_ADD_AREA: 'ae-tour-estimate-add-area',

  /** Estimate sheet table/grid editor.
   *  Owned by: src/components/workshop/EstimateSheetContent.tsx
   *  Route: /workshop/projects/[projectId]/estimates/[nodeId]
   */
  ESTIMATE_SHEET_TABLE: 'ae-tour-estimate-sheet-table',

  /** Component library sidebar panel within estimate editor.
   *  Owned by: src/components/workshop/EstimateSheetContent.tsx (sidebar panel region)
   *  Route: /workshop/projects/[projectId]/estimates/[nodeId]
   */
  ESTIMATE_COMPONENT_LIBRARY: 'ae-tour-estimate-component-library',

  /** Export estimate button.
   *  Owned by: src/components/workshop/EstimateSheetContent.tsx (via HeaderIconToolbar)
   *  Route: /workshop/projects/[projectId]/estimates/[nodeId]
   */
  ESTIMATE_EXPORT: 'ae-tour-estimate-export',

  // =========================================================================
  // Component Library (Phase 6 — future)
  // =========================================================================

  /** Add new component button in library manager.
   *  Owned by: src/components/workshop/component-library-manager/ComponentLibraryManager.tsx (via HeaderIconToolbar)
   *  Route: /workshop/library
   */
  LIBRARY_ADD_COMPONENT: 'ae-tour-library-add-component',

  /** Library folder tree panel.
   *  Owned by: src/components/workshop/component-library-manager/LibraryFolderTree.tsx
   *  Route: /workshop/library
   */
  LIBRARY_FOLDER_TREE: 'ae-tour-library-folder-tree',

  /** Component card grid view.
   *  Owned by: src/components/workshop/component-library/index.tsx
   *  Route: /workshop/library
   */
  LIBRARY_COMPONENT_GRID: 'ae-tour-library-component-grid',

  // =========================================================================
  // Replay Entry Point (Phase 7 — future)
  // =========================================================================

  /** Replay tours entry in Settings → Onboarding.
   *  Owned by: src/app/workshop/settings/page.tsx (Settings hub onboarding card)
   *  Route: /workshop/settings
   */
  REPLAY_ENTRY: 'ae-tour-replay-entry',
} as const;

export type TourTarget = (typeof TOUR_TARGETS)[keyof typeof TOUR_TARGETS];
```

---

## Component Ownership Reference Table

Complete inventory of every proposed `data-tour` target with owning component, route, and implementation phase.

| Target Constant | `data-tour` Value | Owning Component | File | Route | Phase |
|---|---|---|---|---|---|
| `WORKSPACE_SHELL` | `ae-tour-workspace-shell` | `WorkshopPageShell` | `src/components/workshop/WorkshopPageShell.tsx` | `/workshop` | 2-3 |
| `MAIN_NAV_WORKSPACE` | `ae-tour-main-nav-workspace` | `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | `/workshop` | 2-3 |
| `MAIN_NAV_PROJECTS` | `ae-tour-main-nav-projects` | `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | `/workshop` | 2-3 |
| `MAIN_NAV_COMPONENTS` | `ae-tour-main-nav-components` | `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | `/workshop` | 2-3 |
| `MAIN_NAV_TEMPLATES` | `ae-tour-main-nav-templates` | `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | `/workshop` | 2-3 |
| `MAIN_NAV_SETTINGS` | `ae-tour-main-nav-settings` | `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | `/workshop` | 2-3 |
| `HOMEBASE_PROJECTS_CARD` | `ae-tour-homebase-projects-card` | `WorkshopHomebaseClient` | `src/components/workshop/WorkshopHomebaseClient.tsx` | `/workshop` | 2-3 |
| `HOMEBASE_COMPONENTS_CARD` | `ae-tour-homebase-components-card` | `WorkshopHomebaseClient` | `src/components/workshop/WorkshopHomebaseClient.tsx` | `/workshop` | 2-3 |
| `HOMEBASE_TEMPLATES_CARD` | `ae-tour-homebase-templates-card` | `WorkshopHomebaseClient` | `src/components/workshop/WorkshopHomebaseClient.tsx` | `/workshop` | 2-3 |
| `PROJECTS_SEARCH` | `ae-tour-projects-search` | `projects-page-client` | `src/components/workshop/projects-page-client.tsx` | `/workshop/projects` | 4 |
| `PROJECTS_CREATE` | `ae-tour-projects-create` | `projects-page-client` (via `HeaderIconToolbar`) | `src/components/workshop/projects-page-client.tsx` | `/workshop/projects` | 4 |
| `PROJECT_CARD_FIRST` | `ae-tour-project-card-first` | `projects-page-client` (via `LiveProjectCard`) | `src/components/workshop/projects-page-client.tsx` | `/workshop/projects` | 4 |
| `NEW_PROJECT_NAME` | `ae-tour-new-project-name` | `NewProjectModal` | `src/components/workshop/NewProjectModal.tsx` | `/workshop/projects` (modal) | 4 |
| `NEW_PROJECT_IMAGE` | `ae-tour-new-project-image` | `NewProjectModal` | `src/components/workshop/NewProjectModal.tsx` | `/workshop/projects` (modal) | 4 |
| `NEW_PROJECT_SUBMIT` | `ae-tour-new-project-submit` | `NewProjectModal` | `src/components/workshop/NewProjectModal.tsx` | `/workshop/projects` (modal) | 4 |
| `PROJECT_DASHBOARD_OPEN_ESTIMATES` | `ae-tour-project-dashboard-open-estimates` | Project dashboard layout | `src/app/workshop/projects/[projectId]/layout.tsx` | `/workshop/projects/[projectId]` | 4 |
| `PROJECT_DASHBOARD_DETAILS` | `ae-tour-project-dashboard-details` | Project dashboard layout | `src/app/workshop/projects/[projectId]/layout.tsx` | `/workshop/projects/[projectId]` | 4 |
| `ESTIMATES_CREATE` | `ae-tour-estimates-create` | `ProjectEstimatesClient` | `src/components/workshop/ProjectEstimatesClient.tsx` | `/workshop/projects/[projectId]/estimates` | 5 |
| `ESTIMATES_TABLE` | `ae-tour-estimates-table` | `ProjectEstimatesClient` | `src/components/workshop/ProjectEstimatesClient.tsx` | `/workshop/projects/[projectId]/estimates` | 5 |
| `ESTIMATE_TREE` | `ae-tour-estimate-tree` | `EstimateSheetTree` | `src/components/workshop/EstimateSheetTree.tsx` | `.../estimates/[nodeId]` | 5 |
| `ESTIMATE_ADD_GROUP` | `ae-tour-estimate-add-group` | `EstimateSheetTree` (via `HeaderIconToolbar`) | `src/components/workshop/EstimateSheetTree.tsx` | `.../estimates/[nodeId]` | 5 |
| `ESTIMATE_ADD_AREA` | `ae-tour-estimate-add-area` | `EstimateSheetTree` (via `HeaderIconToolbar`) | `src/components/workshop/EstimateSheetTree.tsx` | `.../estimates/[nodeId]` | 5 |
| `ESTIMATE_SHEET_TABLE` | `ae-tour-estimate-sheet-table` | `EstimateSheetContent` | `src/components/workshop/EstimateSheetContent.tsx` | `.../estimates/[nodeId]` | 5 |
| `ESTIMATE_COMPONENT_LIBRARY` | `ae-tour-estimate-component-library` | `EstimateSheetContent` | `src/components/workshop/EstimateSheetContent.tsx` | `.../estimates/[nodeId]` | 5 |
| `ESTIMATE_EXPORT` | `ae-tour-estimate-export` | `EstimateSheetContent` (via `HeaderIconToolbar`) | `src/components/workshop/EstimateSheetContent.tsx` | `.../estimates/[nodeId]` | 5 |
| `LIBRARY_ADD_COMPONENT` | `ae-tour-library-add-component` | `ComponentLibraryManager` (via `HeaderIconToolbar`) | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | `/workshop/library` | 6 |
| `LIBRARY_FOLDER_TREE` | `ae-tour-library-folder-tree` | `LibraryFolderTree` | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `/workshop/library` | 6 |
| `LIBRARY_COMPONENT_GRID` | `ae-tour-library-component-grid` | `component-library/index` | `src/components/workshop/component-library/index.tsx` | `/workshop/library` | 6 |
| `REPLAY_ENTRY` | `ae-tour-replay-entry` | Settings hub | `src/app/workshop/settings/page.tsx` | `/workshop/settings` | 7 |

---

## Route-Aware Tour Registration

### Tour Definition Model

Each tour is an independent `TourDefinition` with its own key, route, steps, and optional prerequisites.

**File:** `src/features/onboarding/types.ts`

```typescript
import type { Step } from 'react-joyride';
import type { TourKey } from './config/tourKeys';
import type { TourTarget } from './config/tourTargets';

/** Extended Joyride step with Archestimator-specific metadata. */
export type TourStep = Step & {
  /** Override Joyride target. Uses data-tour attribute selectors. */
  target: string; // e.g. '[data-tour="ae-tour-workspace-shell"]'
  /** JSDoc-annotated target constant reference for compile-time checking. */
  targetConstant: TourTarget;
  /** Show step on mobile (< lg breakpoint)? Default: true. */
  showOnMobile?: boolean;
  /** Show step for reduced-motion preference? Default: true. */
  showWithReducedMotion?: boolean;
};

export type TourDefinition = {
  /** Versioned tour key from TOUR_KEYS */
  key: TourKey;
  /** Human-readable tour name for Settings replay UI */
  name: string;
  /** Short description for Settings replay UI */
  description: string;
  /** Exact route path where this tour activates. */
  route: string;
  /** Optional regex pattern for dynamic routes (e.g., /workshop/projects/[projectId]/estimates/[nodeId]) */
  routePattern?: RegExp;
  /** Prerequisite tour keys that must be completed before this tour activates. */
  prerequisites?: TourKey[];
  /** Ordered array of tour steps. 4-6 steps per segment. */
  steps: TourStep[];
  /** Disable auto-start? Set true for tours that only activate via replay. */
  disableAutoStart?: boolean;
  /** Is this segment the MVP (Phase 2-3) tour? */
  isMvp?: boolean;
};
```

### Tour Registry

**File:** `src/features/onboarding/config/tourRegistry.ts`

```typescript
import type { TourDefinition } from '../types';
import { TOUR_KEYS } from './tourKeys';

/**
 * Central tour registry. All tours are defined here.
 * Adding a new tour = add a definition to this array.
 * Removing a tour = remove the definition from this array.
 */
export const tourRegistry: TourDefinition[] = [
  // Populated during Phase 3+ implementation.
  // Phase 1 skeleton: empty array.
];

/**
 * Find the active tour for a given pathname.
 * Returns the first matching tour where:
 * 1. Route matches (exact or pattern).
 * 2. Prerequisites are satisfied (if any).
 * 3. Auto-start is not disabled.
 */
export function getActiveTour(
  pathname: string,
  completedTourKeys: Set<string>,
): TourDefinition | undefined {
  return tourRegistry.find((tour) => {
    // Check route match
    const routeMatches =
      tour.route === pathname ||
      (tour.routePattern && tour.routePattern.test(pathname));
    if (!routeMatches) return false;

    // Check prerequisites
    if (tour.prerequisites && tour.prerequisites.length > 0) {
      const allPrereqsMet = tour.prerequisites.every((key) =>
        completedTourKeys.has(key),
      );
      if (!allPrereqsMet) return false;
    }

    // Check not disabled
    if (tour.disableAutoStart) return false;

    return true;
  });
}

/**
 * Get a tour definition by key (for replay, settings UI).
 */
export function getTourByKey(key: string): TourDefinition | undefined {
  return tourRegistry.find((tour) => tour.key === key);
}

/**
 * Get all tour keys that exist in the registry (for Settings → Onboarding listing).
 */
export function getAllTourKeys(): TourDefinition[] {
  return [...tourRegistry];
}

/**
 * Get all tour keys that match a given route (for Pause→Resume logic).
 */
export function getToursForRoute(pathname: string): TourDefinition[] {
  return tourRegistry.filter(
    (tour) =>
      tour.route === pathname ||
      (tour.routePattern && tour.routePattern.test(pathname)),
  );
}
```

### How the Runtime Uses the Registry

The `OnboardingRuntime` component integrates route matching:

```typescript
// Inside OnboardingRuntime (simplified flow):
const pathname = usePathname(); // Next.js hook
const { data: completionState } = useOnboardingState(userId); // TanStack Query
const completedKeys = new Set(
  completionState
    ?.filter((r) => r.status === 'completed' || r.status === 'skipped')
    .map((r) => r.tour_key) ?? [],
);

const activeTour = getActiveTour(pathname, completedKeys);

if (!activeTour) return null; // No tour for this route/user

// Proceed to target detection, auto-start, etc.
```

---

## Tour Segment Model

### Segment Design Principles

1. **Short segments.** 4-6 steps per tour. Tours exceeding 6 steps should be split. Users abandon long tours.

2. **Independent completion.** Each tour segment has its own `tour_key`, its own DB row, and completes independently. Completing Workspace Orientation does not auto-complete Project Creation.

3. **Prerequisite chains.** Tours can declare prerequisites. Project Creation requires Workspace Orientation completed. Estimate Sheet requires Project Creation completed. Prerequisites are checked by `getActiveTour()` — if unmet, the tour does not activate.

4. **Independent replay.** Any completed or skipped tour can be individually replayed from Settings → Onboarding. Replaying Workspace Orientation does not replay Project Creation.

5. **Versioned isolation.** Each tour key carries a version suffix (`_v1`). A version bump creates a new key, treated as a new tour. Existing users with `_v1` completed will see `_v2` if it exists.

### MVP Segment: Workspace Orientation (Phase 2-3)

```
Tour Key: first_workspace_orientation_v1
Route: /workshop
Steps: 6
Prerequisites: none
Auto-start: true (triggered on first /workshop visit after auth)
```

**Step sequence** (abbreviated — full step content in Phase 3 implementation):

| Step | Target | Title | Content Summary |
|------|--------|-------|-----------------|
| 1 | `WORKSPACE_SHELL` | Welcome to Your Workspace | Introduce the shell layout: sidebar, content, footer. Overview of what the workspace is. |
| 2 | `MAIN_NAV_WORKSPACE` | Navigation Sidebar | Explain the sidebar — Workspace, Projects, Components, Templates, Settings. Each is a destination. |
| 3 | `MAIN_NAV_PROJECTS` | Projects | "This is where you'll create and manage your construction projects." |
| 4 | `HOMEBASE_PROJECTS_CARD` | Homebase Shortcuts | The homebase bento grid: quick access to Projects, Components, Templates. |
| 5 | `HOMEBASE_COMPONENTS_CARD` | Component Library | Introduce the cost component library: reusable line items for estimates. |
| 6 | `MAIN_NAV_SETTINGS` | Settings & Help | Wrap up: Settings for profile, workspace, onboarding replay. "You're ready to create your first project." |

**Mobile skip list:** Steps 2, 3, 6 target sidebar items that are hidden on mobile. These steps set `showOnMobile: false`.

---

## Target Availability Rules

| Rule | Description |
|------|-------------|
| **DOM presence** | Target element MUST exist in DOM before step shows. Check via `document.querySelector('[data-tour="..."]')`. |
| **Detection method** | `MutationObserver` on the content area + 100ms polling interval fallback. Timeout: 5 seconds. |
| **Visibility** | Element must not be `display: none` or inside a collapsed/hidden parent. Check via `getBoundingClientRect()` with non-zero dimensions or `checkVisibility()` API. |
| **Timeout behavior** | If target not found within 5s: skip step, log `onboarding_target_missing` event. If ALL targets missing: transition to `errored`. |
| **Z-index conflicts** | Target must not be obscured by another element with higher z-index at the same position. Joyride spotlight uses `z-index: 100` (configurable). Modals use `z-index: 50`. |
| **Scroll position** | Joyride `scrollToFirstStep: true` scrolls target into view. Disable for reduced-motion users. |

---

## Target Naming Rules

| Rule | Example | Anti-Example |
|------|---------|--------------|
| **Prefix:** `ae-tour-` | `ae-tour-workspace-shell` | `tour-workspace-shell` (no namespace) |
| **Format:** `{surface}-{element}` | `ae-tour-projects-create` | `ae-tour-createButton` (camelCase) |
| **Lowercase, hyphens** | `ae-tour-estimate-sheet-table` | `ae-tour-estimateSheetTable` |
| **Unique in codebase** | Enforced by `as const` object | — |
| **No CSS class names** | `ae-tour-workspace-shell` | `sidebar-workspace-btn` |
| **Descriptive element** | `ae-tour-projects-create` | `ae-tour-projects-btn1` |
| **Surface first, element second** | `ae-tour-homebase-projects-card` | `ae-tour-projects-homebase-card` (wrong order) |

---

## Avoiding Selector Drift

Selector drift occurs when a component is refactored or renamed, but its `data-tour` attribute value remains unchanged (or worse, is removed), silently breaking the tour.

### Mitigations

1. **Use `data-tour` attribute directly**, not CSS class selectors. `[data-tour="ae-tour-workspace-shell"]` is explicit and self-documenting. Never target `.sidebar-nav-item` or `#workspace-btn` in tour step config.

2. **Constants object ensures compile-time checking.** `TOUR_TARGETS.WORKSPACE_SHELL` is a TypeScript const. If a developer removes this constant, any import referencing it fails at compile time. If they rename it, `lsp_rename` propagates the change.

3. **JSDoc ownership comments.** Every target constant names its owning component file. If the component is deleted, grep the file path to find orphaned targets.

4. **Lint rule (future).** A custom ESLint rule could verify that every `TOUR_TARGETS.*` value appears in at least one JSX `data-tour={TOUR_TARGETS.*}` expression. Phase 6 testing covers this.

5. **Component rename = target rename.** If `WorkshopPageShell` is renamed to `AppShell`, the target `ae-tour-workspace-shell` must be renamed to `ae-tour-app-shell`. The constant's JSDoc comment guides this.

---

## Handling Shared Components: `HeaderIconToolbar`

### Problem

`HeaderIconToolbar` (`src/components/ui/header-icon-toolbar.tsx`) is a shared primitive used by:

- `projects-page-client.tsx` — project list toolbar (filter, group, add project)
- `ProjectEstimatesClient.tsx` — estimates list toolbar
- `EstimateSheetTree.tsx` — estimate tree toolbar (add group, add area, expand/collapse)
- `EstimateSheetContent.tsx` — sheet toolbar (export, library)
- `ComponentLibraryManager.tsx` — library toolbar (add component)
- `LibraryFolderTree.tsx` — folder tree toolbar
- `TemplateLibraryManager.tsx` — template toolbar
- `ProjectChartsClient.tsx` — charts toolbar
- `ShareEstimateTreePanel.tsx` — share viewer toolbar

Each usage has different actions and needs different tour targets. Adding hardcoded tour targets to the shared primitive would couple the UI library to the onboarding system.

### Solution: Optional `tourTarget` Prop

Add an optional `tourTarget?: string` prop to `HeaderIconToolbar`. Parent components that need tour targeting pass the appropriate constant.

**Modified interface in `header-icon-toolbar.tsx`:**

```typescript
type HeaderIconToolbarProps = {
  // ... existing props ...

  /** Optional data-tour target for the toolbar container.
   *  Set by parent components that want to target the toolbar in a tour step.
   */
  tourTarget?: string;
};
```

**Implementation in `header-icon-toolbar.tsx`:**

```tsx
export function HeaderIconToolbar({ tourTarget, ...props }: HeaderIconToolbarProps) {
  return (
    <div
      className="flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0"
      aria-label={ariaLabel}
      data-tour={tourTarget} // Only renders if tourTarget is provided
    >
      {/* existing toolbar content */}
    </div>
  );
}
```

**Usage in parent components:**

```tsx
// In projects-page-client.tsx:
<HeaderIconToolbar
  tourTarget={TOUR_TARGETS.PROJECTS_CREATE}
  ariaLabel="Project list toolbar"
  labelPrefix="project"
  onAdd={handleCreateProject}
  // ... other props
/>
```

```tsx
// In EstimateSheetTree.tsx:
<HeaderIconToolbar
  tourTarget={TOUR_TARGETS.ESTIMATE_ADD_GROUP}
  ariaLabel="Estimate tree toolbar"
  labelPrefix="node"
  onExpandAll={handleExpandAll}
  // ... other props
/>
```

This keeps `HeaderIconToolbar` clean and decoupled while enabling precise tour targeting per usage context.

---

## Preventing Duplicate Target Names

### TypeScript Enforcement

```typescript
// tourTargets.ts uses `as const` assertion.
// TypeScript prevents duplicate keys in object literals:

// ✅ Compiles:
export const TOUR_TARGETS = {
  WORKSPACE_SHELL: 'ae-tour-workspace-shell',
  MAIN_NAV_WORKSPACE: 'ae-tour-main-nav-workspace',
} as const;

// ❌ TypeScript error: Duplicate key 'WORKSPACE_SHELL'
export const TOUR_TARGETS = {
  WORKSPACE_SHELL: 'ae-tour-workspace-shell',
  WORKSPACE_SHELL: 'ae-tour-workspace-shell', // TS2300
} as const;

// ❌ Duplicate values allowed at runtime but detectable via lint/test.
// Phase 6 test validates value uniqueness:
// expect(new Set(Object.values(TOUR_TARGETS)).size).toBe(Object.keys(TOUR_TARGETS).length);
```

### Code Review Checklist

- [ ] No duplicate `data-tour` values in `tourTargets.ts`.
- [ ] Every `data-tour` value starts with `ae-tour-`.
- [ ] Every target constant has a JSDoc `@Owned by:` comment.
- [ ] Every owning component file still exists at the referenced path.
- [ ] No `data-tour` attributes use CSS class names or element IDs.
- [ ] `HeaderIconToolbar` usages with tour targets pass `tourTarget` prop, never hardcode.

---

## Documenting Target Ownership

### JSDoc Template

```typescript
/**
 * Target description — what element this points to and what the step teaches.
 * Owned by: src/path/to/component.tsx (ComponentName)
 * Route: /workshop/route-path
 */
TARGET_NAME: 'ae-tour-surface-element',
```

### Examples from `tourTargets.ts`

```typescript
/** Full workspace shell outer container.
 *  Owned by: src/components/workshop/WorkshopPageShell.tsx (main element at line 86)
 *  Route: /workshop
 */
WORKSPACE_SHELL: 'ae-tour-workspace-shell',

/** "Create project" / "New project" button in projects list toolbar.
 *  Owned by: src/components/workshop/projects-page-client.tsx (projectToolbarActions via HeaderIconToolbar)
 *  Route: /workshop/projects
 */
PROJECTS_CREATE: 'ae-tour-projects-create',

/** Estimate tree panel (group/area hierarchy).
 *  Owned by: src/components/workshop/EstimateSheetTree.tsx
 *  Route: /workshop/projects/[projectId]/estimates/[nodeId]
 */
ESTIMATE_TREE: 'ae-tour-estimate-tree',
```

---

## Target Implementation Pattern in Components

### Pattern 1: Add to Existing Container Element

When targeting an existing container div, add the `data-tour` attribute.

```tsx
// BEFORE:
<main className="h-[100dvh] overflow-hidden bg-canvas text-ink" aria-label={title}>
  {/* shell content */}
</main>

// AFTER:
<main
  data-tour={TOUR_TARGETS.WORKSPACE_SHELL}
  className="h-[100dvh] overflow-hidden bg-canvas text-ink"
  aria-label={title}
>
  {/* shell content */}
</main>
```

### Pattern 2: Add to Sidebar Nav Items

Each `SidebarNavItemRow` in `MainSidebar.tsx` needs a `data-tour` wrapper or prop.

```tsx
// In MainSidebar.tsx, each nav item gets a tour target:
const sidebarNavItems: Array<SidebarNavItem & { icon: PhosphorIcon; tourTarget?: string }> = [
  { id: "workshop", href: "/workshop", label: "Workshop", icon: SquaresFour, shortcut: "⌘1", tourTarget: TOUR_TARGETS.MAIN_NAV_WORKSPACE },
  { id: "projects", href: "/workshop/projects", label: "Projects", icon: Folder, shortcut: "⌘2", tourTarget: TOUR_TARGETS.MAIN_NAV_PROJECTS },
  // ... etc
];
```

### Pattern 3: Shared Primitive with Optional Prop

```tsx
// HeaderIconToolbar usage:
<HeaderIconToolbar
  tourTarget={TOUR_TARGETS.PROJECTS_CREATE}
  ariaLabel="Project list toolbar"
  labelPrefix="project"
  onAdd={handleCreateProject}
/>
```

### Pattern 4: Modal Elements

```tsx
// In NewProjectModal.tsx:
<div data-tour={TOUR_TARGETS.NEW_PROJECT_NAME}>
  <label htmlFor="project-name">Project name</label>
  <input id="project-name" ... />
</div>
```

---

## Phase Delivery Scope

| Phase | Targets Added | Components Touched | New Files |
|-------|--------------|-------------------|-----------|
| Phase 1 (skeleton) | None | None | `tourKeys.ts`, `tourTargets.ts`, `tourRegistry.ts`, `types.ts` |
| Phase 2 (MVP targets) | 9 targets | `WorkshopPageShell.tsx`, `MainSidebar.tsx`, `WorkshopHomebaseClient.tsx` | None (additive edits only) |
| Phase 3 (MVP tour + runtime) | None (targets already placed) | `OnboardingRuntime.tsx`, `OnboardingProvider.tsx`, `OnboardingTooltip.tsx` | `tour.workspace-orientation.ts`, hooks, services |
| Phase 4 (Projects) | 7 targets | `projects-page-client.tsx`, `NewProjectModal.tsx`, `HeaderIconToolbar.tsx` (prop), project layout | `tour.project-create.ts` |
| Phase 5 (Estimates) | 7 targets | `ProjectEstimatesClient.tsx`, `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx` | `tour.estimate-sheet.ts` |
| Phase 6 (Library) | 3 targets | `ComponentLibraryManager.tsx`, `LibraryFolderTree.tsx`, `component-library/index.tsx` | `tour.library-browse.ts` |
| Phase 7 (Replay + Polish) | 1 target | `settings/page.tsx` | Replay UI component |

---

## References

| Reference | File |
|-----------|------|
| Shell component | `src/components/workshop/WorkshopPageShell.tsx` |
| Sidebar | `src/components/sidebar/MainSidebar.tsx` |
| HeaderIconToolbar | `src/components/ui/header-icon-toolbar.tsx` |
| Projects page | `src/components/workshop/projects-page-client.tsx` |
| NewProjectModal | `src/components/workshop/NewProjectModal.tsx` |
| Homebase client | `src/components/workshop/WorkshopHomebaseClient.tsx` |
| Estimate sheet tree | `src/components/workshop/EstimateSheetTree.tsx` |
| Estimate sheet content | `src/components/workshop/EstimateSheetContent.tsx` |
| Project estimates client | `src/components/workshop/ProjectEstimatesClient.tsx` |
| Component library manager | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` |
| Library folder tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` |
| Component library index | `src/components/workshop/component-library/index.tsx` |
| Settings hub | `src/app/workshop/settings/page.tsx` |
| Feature flag pattern | `WorkshopPageShell.tsx` (`NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`) |
| Dynamic import pattern | `next/dynamic` used in `WorkshopPageShell` (footer), `projects-page-client.tsx:43` |
| Auth user context | `src/lib/auth/session.ts` (`getCurrentUserContext()`) |
