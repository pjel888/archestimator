# Onboarding Research and Principles

Research-backed principles for product onboarding, tailored to ArchEstimator's workshop SaaS.

---

## Research-Backed Principles

### 1. Task-Based Over Feature-Based Tours

Users care about accomplishing work, not learning features. Each tour segment must guide the user through completing a real task—not tour UI elements one-by-one.

**ArchEstimator application**: The primary value proposition is "create your first estimate." A multi-step tour through the sidebar explaining each nav item is feature-based (bad). A tour that guides the user to create a project → open an estimate sheet → add a row is task-based (good).

### 2. Progressive Disclosure

Do not explain everything at first login. The app has charts, templates, AI, settings, collaboration, and a component library. None of these matter before the user has created their first estimate.

**ArchEstimator application**: The workspace model is the only concept a new user needs to understand: **sidebar → projects → estimates → components → export**. Charts, templates, AI, settings, and collaboration should be deferred until the user has completed one estimate.

### 3. 4–6 Steps Per Segment

Attention span research consistently shows abandonment spikes after step 6. Hard cap every tour segment at 6 steps.

**ArchEstimator application**: The `first_workspace_orientation_v1` tour would cover (4–6 steps): workspace homebase → projects nav → create project → project dashboard → estimates tab → estimate sheet. The `first_estimate_sheet_v1` tour would cover: tree structure → adding rows → setting quantities/rates → running total. Each is its own 4–6 step segment.

### 4. Route-Scoped Segments

Targets must be mounted and visible. A tour that starts on `/workshop` and references elements on `/workshop/projects/[projectId]/estimates/[nodeId]` will fail with "target not found" errors.

**ArchEstimator application**: The `tourRegistry` (proposed at `src/features/onboarding/config/tourRegistry.ts`) must map each tour definition to its exact route. The `useMountedTourTargets` hook must verify target availability before advancing to each step.

### 5. Versioned Tour Keys

When tour steps change (new workflow, UI redesign), existing users who already completed the old version should not see the new tour unless explicitly re-invited. Versioned keys solve this: `first_workspace_orientation_v1` is independent from `first_workspace_orientation_v2`.

**ArchEstimator application**: All tour keys follow the convention `{descriptive_name}_v{version}`. The `user_onboarding_tours` table stores completion per key, so bumping the version creates a new row that existing users haven't completed.

### 6. Persist Completion Server-Side

`localStorage` is lost across devices, browsers, and incognito sessions. For a SaaS product, tour completion must be persisted server-side with RLS enforcement.

**ArchEstimator application**: The `user_onboarding_tours` table (RLS-protected, user can only read/write own rows) is the authoritative source. `localStorage` may serve as a transient cache for optimistic read but is never authoritative. This follows the existing pattern of Supabase-backed persistence used across `src/lib/repositories/`.

### 7. Stable Selectors

CSS class selectors are fragile—they break on refactor, style changes, and component re-writes. Use `data-tour` attributes with centralized constants.

**ArchEstimator application**: The existing codebase already uses `data-*` attributes for DOM querying: `data-workshop-page-shell-root` (in `src/components/workshop/WorkshopPageShell.tsx` line 86), `data-workshop-page-shell-canvas`, `data-estimate-center-column`. The onboarding system extends this pattern with `data-tour="ae-tour-{surface}-{element}"` attributes, all defined in `src/features/onboarding/config/tourTargets.ts`.

---

## React Joyride Specific Notes

### useJoyride Hook for Programmatic Control

React Joyride's `useJoyride` hook provides programmatic `start`, `stop`, `next`, `prev`, `goTo` methods. This enables the controlled mode required for route-aware behavior—tours don't auto-start, the runtime controller decides when to start based on route, feature flags, and user state.

### Controlled Mode Preferred Over Uncontrolled

Uncontrolled Joyride auto-starts on mount and runs independently. This breaks in a route-scoped application where tours must wait for navigation, mount verification, and prerequisite checks. Controlled mode (via `useJoyride`'s `stepIndex` + callback props) gives `useOnboardingTourController` full lifecycle management.

### Custom Tooltip Component

The ArchEstimator design system enforces strict typography rules: SF Pro font, 12px max font size, 3px border radius (`rounded-xs`), neutral palette (`#292929` / `#5D5D5D` / `#7F7F7F`). React Joyride's default `Beacon` and `Tooltip` components do not comply. A custom `OnboardingTooltip` component (`src/features/onboarding/components/OnboardingTooltip.tsx`) must match the design system, reusing shared primitives from `src/components/ui/` (Button, Badge, etc.).

### Spotlight Overlay Must Not Block Sidebar

The Joyride spotlight overlay (the dimming layer) captures pointer events by default. On ArchEstimator, the `MainSidebar` (`src/components/sidebar/MainSidebar.tsx`) sits at `z-[100]` and must remain clickable. The overlay's `spotlightClicks` and `disableOverlayClose` props must be configured to allow sidebar interaction while spotlighting the main content area. The sidebar itself may host its own tour targets (e.g., `ae-tour-main-nav-projects`).

---

## What to Avoid

| Anti-Pattern | Why | Correct Approach |
|---|---|---|
| Long linear tours (10+ steps) | User fatigue, high abandonment | 4–6 step segments, chained by prerequisite tours |
| Tours before UI mounts | "Target not found" errors, broken UX | Wait for route + verify targets with `useMountedTourTargets` |
| Tours repeating every login | Annoying, reduces trust | Persist completion server-side in `user_onboarding_tours` |
| localStorage-only persistence | Lost across devices/browsers/sessions | Supabase `user_onboarding_tours` table with RLS; localStorage as transient cache only |
| CSS class selectors | Fragile, breaks on refactor | `data-tour` attributes + `tourTargets.ts` constant map |
| Onboarding logic scattered in random components | Inconsistent behavior, hard to maintain | Centralized runtime in `src/features/onboarding/components/OnboardingRuntime.tsx` |
| Target-not-found crashes | Broken UX, console noise | Graceful skip + error logging via `onboardingEvents.trackTargetMissing()` |
| Importing Joyride in SSR bundle | DOM APIs break during SSR, bloats public route bundles | Dynamic import with `ssr: false` in `OnboardingRuntime`, only loaded on `/workshop` routes |
| Tour runs on public routes | Wastes bandwidth, shows broken tours to unauthenticated users | `OnboardingRuntime` only renders inside `WorkshopPageShell` (authenticated route shell) |
| No replay mechanism | Users who skip can never revisit | Replay entry in Settings hub (`/workshop/settings`) via `OnboardingReplayMenuItem` |
| Inline environment checks | Hard to disable globally | Feature flag: `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` following the pattern of `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` in `src/lib/ai/feature-flags.ts` |

---

## ArchEstimator Onboarding Philosophy

### Guide Toward First Estimate

The core value proposition is **creating an estimate**. All MVP onboarding should point to this outcome. A user who creates their first estimate has experienced the product's primary workflow and is more likely to return.

### Teach the Workspace Model

The ArchEstimator information architecture follows a clear hierarchy:

```
Workspace → Projects → Estimates → Estimate Nodes (tree) → Row Items → Export
```

The onboarding must reveal this mental model progressively rather than explaining everything at once. Route-scoped tours naturally align with this hierarchy:

| Tour | Route | Teaches |
|---|---|---|
| Workspace Orientation | `/workshop` | Homebase dashboard, nav structure |
| First Project Creation | `/workshop/projects` | Project list, create project form |
| Estimate Sheet Basics | `/workshop/projects/[id]/estimates/[nodeId]` | Tree, rows, quantities, totals |
| Component Library Intro | `/workshop/library` | Cost items, drag-drop to estimate |

### Show Just Enough

**Defer** these features until the user has completed one estimate:
- Charts/analytics (`src/components/workshop/project-charts/`)
- Templates (`src/app/workshop/templates/`)
- AI Copilot "Ask Flip" (already gated by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` in `src/lib/ai/feature-flags.ts`)
- Settings pages (profile, workspace, beta users)
- Collaboration invites
- Publication/shared links

### Defer Advanced Features

The onboarding system itself supports advanced features (multi-tour chaining, prerequisite tours, analytics events) but the **MVP ships only 1–2 tours**. Additional tours are added later as the feature set stabilizes.

---

## Principles → Implementation Rules

| Principle | Implementation Rule |
|---|---|
| **Task-based** | Each tour segment maps to a real user task (e.g., "Create your first project" not "Here's the projects nav item") |
| **Progressive disclosure** | Only ship 1–2 MVP tours (`first_workspace_orientation_v1`, `first_project_creation_v1`); add more later |
| **Short segments** | Hard cap of 6 steps per tour segment; enforced in `tourRegistry.ts` validation |
| **Contextual** | Tour runs only on the route with visible targets; `getTourForRoute(pathname)` in `tourRegistry.ts` |
| **Versioned keys** | All tour keys include `_v{N}` suffix (e.g., `first_project_creation_v1`) |
| **Server persistence** | `user_onboarding_tours` table, RLS-protected (new table, separate from existing `user_onboarding_profiles`) |
| **Stable targets** | `data-tour` attributes + centralized constants in `src/features/onboarding/config/tourTargets.ts` |
| **Client-only** | Dynamic import with `ssr: false`; never in SSR bundle; never on public routes |
| **Replayable** | Replay entry in Settings hub (`/workshop/settings`) via `src/features/onboarding/components/OnboardingReplayMenuItem.tsx` |
| **Feature flagged** | `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` (following the `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` pattern in `src/lib/ai/feature-flags.ts`) |
| **Graceful failures** | Target not found = skip step; Joyride load failure = catch error, log, do not crash app; Supabase down = use cached state |
| **Two-phase rollback** | Feature flag off = zero overhead, nothing renders; all onboarding code tree-shaken from initial bundle |

---

## Reference: Existing Codebase Patterns Used

| Pattern | Existing File | Used For |
|---|---|---|
| Client-only component inside async server shell | `src/components/workshop/WorkshopPageShell.tsx` line 132: `{showAskFlip ? <AskFlipFooterAssistant /> : null}` | `{enabled ? <OnboardingRuntime /> : null}` |
| Feature flag env var + `readBooleanFeatureFlag()` | `src/lib/ai/feature-flags.ts` lines 4–10 | `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` feature flag |
| `data-*` DOM attributes | `src/components/workshop/WorkshopPageShell.tsx` lines 86, 89: `data-workshop-page-shell-root`, `data-workshop-page-shell-canvas` | `data-tour="ae-tour-{surface}-{element}"` |
| Server actions in `src/lib/*/actions.ts` | 7 existing files: `src/lib/estimates/actions.ts`, `src/lib/projects/actions.ts`, etc. | `src/lib/onboarding/actions.ts` |
| RLS-protected user table | `supabase/migrations/20260527072220_auth_account_data.sql` lines 1–31 (`user_onboarding_profiles`) | New `user_onboarding_tours` table |
| Settings page with `WorkshopPageShell` | `src/app/workshop/settings/page.tsx` | Replay entry point context |
| Phosphor Icons | `src/components/sidebar/MainSidebar.tsx` lines 6, 32–51 | Icons in custom `OnboardingTooltip` |
| Design-system primitives from `src/components/ui/` | Button (`src/components/ui/button`), Badge, etc. | Reused in `OnboardingTooltip` |
