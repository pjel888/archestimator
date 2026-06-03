# Recommended Architecture

Sustainable architecture for the React Joyride onboarding system in Archestimator, with specific codebase references and rationale for every decision.

---

## Feature Folder Location

### Recommendation: `src/features/onboarding/`

### Rationale

The repository organizes distinct feature areas under `src/components/` (UI components) and `src/lib/` (business logic, server actions, services). Onboarding is a cross-cutting concern—it touches the sidebar, the workshop shell, settings, and multiple routes. It is not a single component that fits into the existing 58-component `src/components/workshop/` directory.

**Evaluated alternatives:**

| Location | Verdict | Reasoning |
|---|---|---|
| `src/features/onboarding/` | ✅ **Recommended** | Isolates all onboarding concerns (components, config, hooks, services, types, tests) in one discoverable folder. The `src/features/` directory name is new to the repo but follows a well-established convention in feature-foldered Next.js projects. It signals that this is a coherent feature, not a utility or a single component. |
| `src/components/workshop/Onboarding*` | ❌ Not recommended | The `src/components/workshop/` directory already contains 58 files (see glob results). Onboarding is a cross-cutting concern, not a single workshop component. Adding 10+ files here would worsen component sprawl. |
| `src/lib/onboarding/` | ⚠️ Partial fit | Appropriate for services (server actions, persistence, event tracking) but not for React components, hooks, or tour configurations. The lib directory is for domain logic and data access, not UI. |
| `src/hooks/onboarding/` | ❌ Too narrow | Only covers hooks. Onboarding needs components, configuration, types, and services—not just hooks. |

---

## Recommended Folder Structure

```
src/features/onboarding/
├── components/
│   ├── OnboardingRuntime.tsx          # Client-only Joyride wrapper, feature-gated
│   ├── OnboardingProvider.tsx         # React context for tour state/methods
│   ├── OnboardingTooltip.tsx          # Design-system-compliant custom tooltip
│   └── OnboardingReplayMenuItem.tsx   # Replay entry point (Settings/Help menu)
├── config/
│   ├── tourRegistry.ts               # Central tour registration, route → tour mapping
│   ├── tourTargets.ts                # data-tour attribute constants
│   ├── firstWorkspaceOrientationTour.ts  # Tour 1: Workspace overview
│   ├── firstProjectCreationTour.ts    # Tour 2: Create first project
│   ├── firstEstimateSheetTour.ts      # Tour 3: Estimate sheet basics
│   └── componentLibraryIntroTour.ts   # Tour 4: Component library intro
├── hooks/
│   ├── useOnboardingState.ts          # Fetch/update tour state from Supabase
│   ├── useOnboardingTourController.ts # Tour lifecycle management
│   └── useMountedTourTargets.ts       # Target availability detection
├── services/
│   ├── onboardingPersistence.ts       # Server actions wrapper
│   └── onboardingEvents.ts            # No-op analytics abstraction
├── types/
│   └── onboarding.ts                  # TypeScript types for tours, steps, state
└── __tests__/                         # Feature-specific tests
```

**Note on types location**: The repo currently has no dedicated `src/types/` directory. Types are co-located with their feature code (e.g., types defined in `src/lib/estimates/` for estimate domain types). The `src/features/onboarding/types/` directory follows this co-location pattern.

---

## Provider/Runtime Location

### Recommendation: Render `<OnboardingRuntime />` inside `WorkshopPageShell`

### Do NOT add to `src/app/providers.tsx`

`src/app/providers.tsx` is the root-level client provider wrapper (`"use client"` at line 1) that wraps the entire application—including public routes (landing, about, pricing, contact, login, terms, privacy). Adding `OnboardingRuntime` here would:
- Load Joyride on public routes where it will never run
- Increase bundle size for unauthenticated users
- Require additional auth-gating logic

Current content of `src/app/providers.tsx`:
```tsx
// Line 28-41
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BfcacheHandler />
        <PerformanceMonitor />
        <NavigationListener />
        {children}
        <RouteLoadingOverlay />
      </ToastProvider>
    </QueryClientProvider>
  );
}
```

All providers here are globally applicable (QueryClient, Toast, navigation, performance). Onboarding is not globally applicable—it should remain excluded from this file.

### Add inside `WorkshopPageShell`

`src/components/workshop/WorkshopPageShell.tsx` is the authenticated workspace shell. It is an async server component (line 60: `export async function WorkshopPageShell`). The existing pattern for conditional client components is visible at line 132:

```tsx
// Line 132: existing conditional client component pattern
{showAskFlip ? <AskFlipFooterAssistant /> : null}
```

The onboarding runtime follows the same pattern:

```tsx
// Proposed addition (alongside the existing AskFlip pattern)
const onboardingEnabled = isOnboardingToursEnabled();
// ... then in the JSX:
<footer ...>
  {/* existing footer content */}
  {showAskFlip ? <AskFlipFooterAssistant /> : null}
  {onboardingEnabled ? <OnboardingRuntime /> : null}
</footer>
```

**Boundary detail**: `WorkshopPageShell` is an async server component. `OnboardingRuntime` is a `"use client"` component that renders Joyride. React's server/client component boundary rules allow server components to render client components as children. No wrapper or provider indirection is needed—the `<OnboardingRuntime />` import is a direct client component reference in a server component's JSX.

### Not in a Next.js layout

The workspace currently uses `WorkshopPageShell` as a component wrapper rather than a nested Next.js `layout.tsx` (only `/workshop/projects/[projectId]` has a dedicated `layout.tsx` for the project sidebar + header). Following this convention, `OnboardingRuntime` is placed inside `WorkshopPageShell` rather than a layout file.

---

## Tour Registry Structure

`src/features/onboarding/config/tourRegistry.ts`:

```typescript
import { firstWorkspaceOrientationTour } from "./firstWorkspaceOrientationTour";
import { firstProjectCreationTour } from "./firstProjectCreationTour";
import { firstEstimateSheetTour } from "./firstEstimateSheetTour";
import { componentLibraryIntroTour } from "./componentLibraryIntroTour";

export interface TourDefinition {
  key: string;           // e.g., 'first_workspace_orientation_v1'
  version: number;
  route: string;         // e.g., '/workshop'
  steps: TourStep[];
  autoStart: boolean;    // auto-start for first login
  allowReplay: boolean;  // can be replayed from menu
  prerequisiteTour?: string; // optional prerequisite tour key
}

export const tourRegistry: TourDefinition[] = [
  firstWorkspaceOrientationTour,
  firstProjectCreationTour,
  firstEstimateSheetTour,
  componentLibraryIntroTour,
];

export function getTourForRoute(pathname: string): TourDefinition | undefined {
  // Match pathname to tour route (with [param] wildcard support)
}
```

**MVP scope**: Only `firstWorkspaceOrientationTour` and `firstProjectCreationTour` are implemented in the initial release. The remaining entries are placeholders for future tours.

---

## Data Target Strategy

### Pattern: `data-tour` attributes

The codebase already uses `data-*` attributes for DOM querying in the workshop shell:

| Existing Attribute | File | Usage |
|---|---|---|
| `data-workshop-page-shell-root` | `src/components/workshop/WorkshopPageShell.tsx:86` | Main shell container |
| `data-workshop-page-shell-canvas` | `src/components/workshop/WorkshopPageShell.tsx:89` | Content area (queried by `ResizableSidePanel.tsx:95`, `ProjectEstimateMetadataStrip.tsx:55`) |
| `data-estimate-center-column` | `src/components/workshop/WorkshopPageShell.tsx:127` | Estimate center column boundary |

The onboarding system extends this pattern with `data-tour` attributes.

### Naming convention: `ae-tour-{surface}-{element}`

Examples:
- `ae-tour-main-nav-projects` — Projects nav item in MainSidebar
- `ae-tour-homebase-new-project` — "New Project" card on WorkshopHomebaseClient
- `ae-tour-project-dashboard-estimates` — Estimates tab on project dashboard
- `ae-tour-sidebar-workshop` — Workshop home nav item

### Centralized constants

All targets are defined in `src/features/onboarding/config/tourTargets.ts` as a TypeScript const object (not an enum, to match the codebase's preference for `as const` patterns—see `src/app/workshop/settings/page.tsx` lines 5–29 for the `as const` convention):

```typescript
export const TOUR_TARGETS = {
  MAIN_NAV_WORKSHOP: "ae-tour-main-nav-workshop",
  MAIN_NAV_PROJECTS: "ae-tour-main-nav-projects",
  MAIN_NAV_LIBRARY: "ae-tour-main-nav-library",
  HOMEBASE_NEW_PROJECT: "ae-tour-homebase-new-project",
  HOMEBASE_OPEN_PROJECT: "ae-tour-homebase-open-project",
  PROJECT_ESTIMATES_TAB: "ae-tour-project-estimates-tab",
  ESTIMATE_SHEET_TREE: "ae-tour-estimate-sheet-tree",
  // ...
} as const;
```

### Adding targets to components

Targets are added at the product component level, not in the onboarding folder. For example:
- `src/components/sidebar/MainSidebar.tsx` — Add `data-tour` to `SidebarNavItemRow` elements
- `src/components/workshop/WorkshopHomebaseClient.tsx` — Add `data-tour` to destination cards

### Shared primitives: optional `tourTarget` prop

For shared components that may host tour targets (e.g., button bars, header toolbars), add an optional `tourTarget?: string` prop rather than hardcoding target attributes. This keeps the shared component reusable while allowing it to be a tour target when needed.

---

## Persistence Approach

### Server actions location: `src/lib/onboarding/actions.ts`

Following the existing convention of `src/lib/*/actions.ts`:

| Existing File | Domain |
|---|---|
| `src/lib/estimates/actions.ts` | Estimate CRUD |
| `src/lib/projects/actions.ts` | Project management |
| `src/lib/component-library/actions.ts` | Cost library |
| `src/lib/workshop/actions.ts` | Workshop-level operations |
| `src/lib/auth/actions.ts` | Auth gates, account management |
| `src/lib/collaboration/actions.ts` | Invites, access control |
| `src/lib/publication/actions.ts` | Share links, snapshots |

**New**: `src/lib/onboarding/actions.ts` — Tour completion CRUD server actions.

### Table: `user_onboarding_tours` (new)

Separate from the existing `user_onboarding_profiles` table (defined in `supabase/migrations/20260527072220_auth_account_data.sql` lines 1–31). The existing table tracks profile setup completion (display name, user category, country, etc.)—a one-time profile configuration step. The new table tracks per-tour completion:

```sql
CREATE TABLE public.user_onboarding_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tour_key text NOT NULL,           -- e.g., 'first_workspace_orientation_v1'
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'skipped', 'in_progress')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_key)
);

ALTER TABLE public.user_onboarding_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_onboarding_tours_select_own
  ON public.user_onboarding_tours FOR SELECT
  USING (auth.uid() = user_id);

-- Server actions handle writes; no direct INSERT/UPDATE access from client
```

### RLS policies

Follow the pattern from the existing `user_onboarding_profiles` policies (lines 136–160 of the migration):
- User can SELECT own rows
- Writes go through server actions using the service role or authenticated user context (as in `src/lib/auth/actions.ts`)

### Client-side state

- **TanStack Query**: Optional caching layer for tour completion state (the app already uses TanStack Query via `src/app/providers.tsx` line 3)
- **Zustand**: Runtime tour state (current step, active tour, loading) — the app already uses Zustand via `src/stores/` (`estimate-ui-store.ts`, `navigation-ui-store.ts`)
- **localStorage**: Transient cache only, never authoritative

---

## Feature Flag

### Environment variable: `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED`

Following the pattern established in `src/lib/ai/feature-flags.ts`:

```typescript
// src/lib/onboarding/feature-flags.ts
export const ONBOARDING_TOURS_ENABLED_ENV = "NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED";

function readBooleanFeatureFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return defaultValue;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return defaultValue;
}

export function isOnboardingToursEnabled(): boolean {
  return readBooleanFeatureFlag(ONBOARDING_TOURS_ENABLED_ENV, false);
}
```

### Default state

**Default: disabled (`false`)**. Matches the posture of `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` (default `false` in `.env.example` line 48) and `ARCHESTIMATOR_AI_ENABLED` (default `false` in line 47).

### Check site

Checked in `WorkshopPageShell` (server component) before rendering `OnboardingRuntime`. The feature flag function is importable server-side since it reads `process.env`.

---

## SSR/Client Boundary

### React Joyride is client-only

Joyride uses DOM APIs (`document.querySelector`, `window`, `addEventListener`). It cannot render during SSR.

### Dynamic import pattern

```typescript
// src/features/onboarding/components/OnboardingRuntime.tsx
"use client";

import dynamic from "next/dynamic";

// Joyride dynamically imported, SSR disabled
const Joyride = dynamic(
  () => import("react-joyride").then((mod) => mod.default),
  { ssr: false }
);
```

### Tour config files are server-safe

Tour definition files (e.g., `firstWorkspaceOrientationTour.ts`) export pure data objects (step arrays, metadata). They contain no React, no hooks, no DOM references. They can be safely imported in both server and client contexts.

---

## Lazy-Loading Strategy

### Three-tier loading gate

`OnboardingRuntime` renders nothing (returns `null`) unless all three conditions are true:

1. **User is authenticated** — checked via `useOnboardingState` which queries the user session
2. **Feature flag is enabled** — `isOnboardingToursEnabled()` returns `true`
3. **User is on a `/workshop` route** — inherently true because `OnboardingRuntime` only renders inside `WorkshopPageShell`

### Bundle impact

- Joyride is never in the initial bundle of public routes (landing, login, pricing, etc.)
- Joyride is tree-shaken out of the initial `/workshop` page load (dynamically imported)
- Only users who hit all three gates pay the Joyride download cost

---

## Failure Modes

| Failure | Handling | Implementation |
|---|---|---|
| Target not found (DOM element missing) | Log event, skip to next step, continue tour | `onboardingEvents.trackTargetMissing(step, reason)` — no-op in MVP, logs to console |
| Supabase unavailable (network error) | Use cached completion state from last successful read; retry on next login | `useOnboardingState` falls back to in-memory cache; show tour on next session if state couldn't be verified |
| Joyride dynamic import failure (network error, bundle corruption) | Catch error boundary, log, do not crash app | `OnboardingRuntime` uses a `try/catch` around the dynamic import; failure is silent |
| Feature flag off | Nothing renders, zero overhead | Checked in `WorkshopPageShell` before rendering; `OnboardingRuntime` never mounts |
| User not authenticated | Tour state query returns null, runtime exits early | `useOnboardingState` returns `{ user: null }` when unauthenticated |

---

## Naming Convention

| Category | Convention | Example |
|---|---|---|
| Tour keys | `{descriptive_name}_v{version}` | `first_workspace_orientation_v1` |
| Target attributes | `ae-tour-{surface}-{element}` | `ae-tour-main-nav-projects` |
| Component files | PascalCase | `OnboardingRuntime.tsx` |
| Hook files | camelCase with `use` prefix | `useOnboardingState.ts` |
| Service files | camelCase | `onboardingPersistence.ts` |
| Config files | camelCase | `tourRegistry.ts` |
| Type files | camelCase | `onboarding.ts` |
| Test files | PascalCase with `.test` suffix | `OnboardingRuntime.test.tsx` |
| Feature flag | `NEXT_PUBLIC_*` for client-safe, `ARCHESTIMATOR_*` for server-only | `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` |

---

## Replay Mechanism

### Entry point

Located in the Settings hub (`/workshop/settings/page.tsx`). This page already renders inside `WorkshopPageShell` (line 72: `return (<WorkshopPageShell ...>`) and organizes settings into sections with `SettingsLinkCard` components.

The `OnboardingReplayMenuItem` component displays a section with available replayable tours, each with a "Replay" button that triggers `useOnboardingTourController.start(tourKey, { replay: true })`.

### Available replay tours

Only tours where `tourDefinition.allowReplay === true` appear in the replay list. In MVP, both `first_workspace_orientation_v1` and `first_project_creation_v1` are replayable.

### Replay behavior

- Replaying does NOT delete or reset the server-side completion record
- It starts a fresh tour instance in the runtime state
- If the user completes the replayed tour, the existing completion record's `updated_at` timestamp is refreshed
- Each tour can be replayed independently (replaying workspace orientation does not trigger the project creation tour)

---

## Event Tracking Abstraction

### File: `src/features/onboarding/services/onboardingEvents.ts`

```typescript
// No-op analytics abstraction — wired to console.log in MVP
export const onboardingEvents = {
  trackTourStart(tourKey: string) { /* no-op */ },
  trackStepView(tourKey: string, stepIndex: number) { /* no-op */ },
  trackTourComplete(tourKey: string) { /* no-op */ },
  trackTourSkip(tourKey: string, stepIndex: number) { /* no-op */ },
  trackTargetMissing(stepSelector: string, reason: string) { /* no-op */ },
  trackError(tourKey: string, error: Error) { /* no-op */ },
};
```

### Rationale

This abstraction exists so that when real analytics are integrated (GA, PostHog, custom), only one file needs updating. The `onboardingEvents` object is passed through the `OnboardingProvider` context so any component in the onboarding tree can call it without prop drilling.

### Does NOT block MVP

All functions are no-ops in the initial release. No analytics infrastructure is required.

---

## Reference: Existing Patterns Mirrored

| Architectural Decision | Mirrors Existing Pattern |
|---|---|
| Feature-gated client component in server shell | `{showAskFlip ? <AskFlipFooterAssistant /> : null}` in `WorkshopPageShell.tsx:132` |
| `NEXT_PUBLIC_*` env var + `readBooleanFeatureFlag()` | `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` in `src/lib/ai/feature-flags.ts` |
| Server actions in `src/lib/*/actions.ts` | 7 existing files: `src/lib/estimates/actions.ts`, `src/lib/projects/actions.ts`, `src/lib/component-library/actions.ts`, `src/lib/workshop/actions.ts`, `src/lib/auth/actions.ts`, `src/lib/collaboration/actions.ts`, `src/lib/publication/actions.ts` |
| `data-*` DOM attributes for stable querying | `data-workshop-page-shell-root`, `data-workshop-page-shell-canvas` in `WorkshopPageShell.tsx` |
| RLS-protected user table | `user_onboarding_profiles` in `supabase/migrations/20260527072220_auth_account_data.sql` |
| `as const` object pattern | `src/app/workshop/settings/page.tsx` lines 5–29 |
| Phosphor Icons for UI | `@phosphor-icons/react` imported throughout `MainSidebar.tsx`, settings page, etc. |
| Tailwind v4 CSS-first config | No `tailwind.config.ts`; all styles via `className` |
| Design-system enforcement | `scripts/enforce-app-design-system.mjs` — SF Pro, 12px max, 3px radius, neutral palette |
| TanStack Query for server state | `src/app/providers.tsx` line 3: `QueryClient` staleTime 5min, gcTime 5min |
| Zustand for runtime UI state | `src/stores/estimate-ui-store.ts`, `src/stores/navigation-ui-store.ts` |
| Dynamic import for client-only modules | Pattern: `dynamic(() => import(...), { ssr: false })` |
