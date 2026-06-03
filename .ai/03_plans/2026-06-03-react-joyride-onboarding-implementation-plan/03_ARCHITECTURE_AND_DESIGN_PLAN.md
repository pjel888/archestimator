# 03 — Architecture & Design Plan

**Date:** 2026-06-03 (refined)  
**Source:** Enhanced from `03_recommended_architecture.md`  
**Full detail:** See `03_recommended_architecture.md` for exhaustive architecture discussion

---

## Proposed Approach

**Option C — Registry supporting route-scoped tour segments:** A shared `src/features/onboarding/` feature folder with a centralized tour registry, target constants, and individual tour definitions. Workspace Orientation is MVP first tour. Runtime mounts inside `WorkshopPageShell` via `next/dynamic` with `ssr: false`. Persistence via Supabase `user_onboarding_tours` table with RLS.

## Why It Fits ArchEstimator

- **Matches existing patterns:** Feature folder (like `src/features/`), feature flags (`NEXT_PUBLIC_*` pattern), `next/dynamic` client-only imports (Copilot button precedent)
- **Scoped to authenticated workspace:** Only `WorkshopPageShell` mounts the runtime — public routes untouched
- **Reuses stack:** Supabase for persistence (48 migrations proven), TanStack Query for caching, design-system compliant
- **Reversible:** Feature flag gates everything; `false` = zero runtime impact

## Folder Structure

```
src/features/onboarding/
├── components/
│   ├── OnboardingRuntime.tsx       # 'use client' — controlled Joyride, route-aware
│   ├── OnboardingProvider.tsx      # Context: active tour, step state, completion
│   └── OnboardingTooltip.tsx       # Custom tooltip: SF Pro, 12px max, xs radius
├── config/
│   ├── tourRegistry.ts             # Tour definitions by versioned key
│   ├── tourTargets.ts              # data-tour attribute constants
│   ├── tour.workspace-orientation.ts  # MVP tour: 5 steps
│   ├── tour.project-create.ts      # Future tour
│   ├── tour.estimate-sheet.ts      # Future tour
│   └── tour.library-browse.ts      # Future tour
├── hooks/
│   ├── useOnboardingState.ts       # Reads persisted tour state from Supabase
│   └── useOnboardingTourController.ts  # Joyride controlled-mode state machine
├── services/
│   ├── onboardingPersistence.ts    # Supabase read/write for user_onboarding_tours
│   └── onboardingEvents.ts         # Optional: tour event hooks (no-op by default)
├── types.ts                        # Tour, TourStep, TourCompletion, TourEvent
├── index.ts                        # Barrel export
└── __tests__/                      # Co-located tests
    ├── tourRegistry.test.ts
    ├── onboardingPersistence.test.ts
    ├── useOnboardingState.test.ts
    ├── useOnboardingTourController.test.ts
    ├── OnboardingRuntime.test.tsx
    └── OnboardingTooltip.test.tsx
```

## Folder Location Decision

**Recommended: `src/features/onboarding/`**

| Option | Verdict | Reason |
|--------|---------|--------|
| `src/features/onboarding/` | **SELECTED** | Clean feature isolation. Co-located components, hooks, services, tests. No pollution of UI component tree. |
| `src/components/workshop/onboarding/` | Rejected | Onboarding is not a UI component — it's a feature with persistence, hooks, and logic. |
| `src/lib/onboarding/` | Rejected | Contains React components (`'use client'`) — `lib/` is for logic/services. |
| `src/hooks/onboarding/` | Rejected | Too narrow — onboarding is more than hooks. |

## Provider Placement

**Mount in `WorkshopPageShell`**, NOT in `src/app/providers.tsx`.

**Reasoning:**
1. `providers.tsx` serves all routes including public — would load Joyride everywhere
2. `WorkshopPageShell` is the authenticated boundary — matching the scope requirement
3. `next/dynamic` with `ssr: false` ensures zero SSR impact
4. Feature flag check prevents dynamic import execution when disabled

## Route-Scoped Tour Selection

Tour controller reads `usePathname()` to determine active route:
- `/workshop` → `workspace.orientation.v1`
- `/workshop/projects` → `project.create.v1` (future)
- `/workshop/projects/[projectId]/estimates/[nodeId]` → `estimate.sheet.v1` (future)
- `/workshop/library` → `library.browse.v1` (future)

If route has no registered tour, runtime renders null.

## Persistence Design

**Table:** `user_onboarding_tours`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `uuid` | Primary key, `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE |
| `workspace_id` | `uuid` | FK → `workspaces(id)`, nullable |
| `tour_key` | `text` | Versioned key: `workspace.orientation.v1` |
| `tour_version` | `integer` | Default 1 |
| `status` | `text` | CHECK: `not_started`, `started`, `completed`, `skipped` |
| `current_step` | `integer` | Nullable, last step index |
| `started_at` | `timestamptz` | Nullable |
| `completed_at` | `timestamptz` | Nullable |
| `skipped_at` | `timestamptz` | Nullable |
| `last_seen_at` | `timestamptz` | Nullable |
| `metadata` | `jsonb` | Default `'{}'` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

**UNIQUE:** `(user_id, workspace_id, tour_key, tour_version)`

**RLS:** `auth.uid() = user_id` for SELECT/INSERT/UPDATE. No DELETE policy.

## Feature Flag

`NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` (default off). Follows existing `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` pattern.

## Analytics

**No-op event abstraction.** `onboardingEvents.ts` exports stub functions (`onTourStart`, `onStepChange`, `onTourComplete`, `onTourSkip`). No analytics framework is wired. Future integration point is documented but not implemented.

## SSR/Client Boundary

- `OnboardingRuntime` is `'use client'` with `next/dynamic({ ssr: false })`
- Tour registry and target constants are pure TypeScript — safe for any boundary
- `useOnboardingState` uses TanStack Query with Supabase client — client-only

## Lazy-Loading Strategy

```typescript
// In WorkshopPageShell:
const OnboardingRuntime = dynamic(
  () => import('@/features/onboarding/components/OnboardingRuntime'),
  { ssr: false }
);

// Only execute dynamic import when flag is true:
const toursEnabled = process.env.NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED === 'true';
```

## Alternatives Rejected

| Alternative | Reason Rejected |
|-------------|----------------|
| Shepherd.js | jQuery-era heritage, heavier, less React-native |
| Intro.js | No React-native API, DOM manipulation |
| React Tour | Unmaintained, archived |
| Custom build | Reinventing the wheel for a solved problem |
| Global provider placement | Would load Joyride on public routes |

## Anti-Overengineering Guardrails

- Start with ONE tour (Workspace Orientation, 5 steps)
- No tour builder/admin UI until proven needed
- No analytics integration until analytics framework exists
- No cross-route continuous tours for MVP
- No stored conversation or tour interaction history beyond simple completion status
