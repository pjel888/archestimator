# 00 Executive Summary

## Sharp Summary

Build a React Joyride-based onboarding system for ArchEstimator's authenticated workspace. Route-scoped tour segments with versioned keys, Supabase persistence, and replay capability. Scoped entirely to `/workshop` surfaces behind the existing `WorkshopPageShell`. First tour: Workspace Orientation. Planning-only — no code, no packages, no migrations at this stage.

## Why React Joyride Is Appropriate

React Joyride is the right library for this job:

- **Battle-tested.** 20k+ GitHub stars, maintained since 2016, extensive production usage across SaaS products.
- **Step-based tours.** Native support for multi-step tours with progress tracking, skip, and completion callbacks — exactly the model Archestimator needs.
- **Flexible targeting.** Supports CSS selectors, React refs, and target functions — critical for targeting dynamically rendered estimate trees, sidebar items, and command palette entries.
- **Controlled + uncontrolled modes.** The controlled mode lets Archestimator manage tour state through `useOnboardingTourController`, enabling route-scoped tour selection, persistence gate checks, and replay without fighting the library.
- **Accessibility.** Built-in ARIA attributes, focus management, keyboard navigation, and screen-reader announcements.
- **Custom tooltips.** Full tooltip component override via the `tooltipComponent` prop, allowing design-system-compliant rendering (SF Pro, 12px max, xs radius, neutral palette, Phosphor icons).
- **React 19 compatible.** React Joyride 2.x works with React 18+ and has no known breaking incompatibilities with React 19.2. The Phase 1 skeleton will verify this before any implementation proceeds.

Alternatives considered and rejected: Shepherd.js (heavier, jQuery-era heritage), Intro.js (no React-native API, DOM manipulation), React Tour (unmaintained, archived), and custom build (reinventing the wheel for a solved problem). React Joyride is the clear winner for a React-first SaaS app.

## Why Scoped to Authenticated `/workshop`

Three hard constraints drive this scope:

1. **Public routes must stay lean.** `/`, `/login`, `/share`, `/invite`, `/about`, `/pricing`, `/contact`, `/privacy`, and `/terms` serve unauthenticated users and must not bundle onboarding runtime. The onboarding system has zero value on these surfaces — no tour steps to show, no authenticated user to persist completion for.

2. **Onboarding runtime must not leak into public bundles.** React Joyride adds ~30KB gzipped to the client bundle. Lazy-loading inside `WorkshopPageShell` ensures this cost is only paid by authenticated users who need tours. Public pages keep their current performance profile.

3. **Only authenticated users need tours.** Tours teach the product workspace. A signed-out visitor on the landing page doesn't need "how to create a project" — they need conversion copy, not tooltips. The first meaningful onboarding moment is after authentication, inside the workspace.

The integration point is `WorkshopPageShell` (`src/app/workshop/page.tsx` — exact file to verify during implementation). The runtime component mounts as a sibling of workspace content, never inside `PublicPageShell`.

## Recommended Architecture (One Page)

```
src/features/onboarding/
├── components/
│   ├── OnboardingRuntime.tsx       # Client-only, lazy-loaded. Mounts inside WorkshopPageShell.
│   ├── OnboardingProvider.tsx      # Context provider: active tour, step state, completion state.
│   └── OnboardingTooltip.tsx       # Custom tooltip: SF Pro, 12px max, xs radius, Phosphor icons.
├── config/
│   ├── tourRegistry.ts             # Tour definitions indexed by versioned key string.
│   ├── tourTargets.ts              # data-tour attribute constants for DOM targeting.
│   ├── tour.workspace-orientation.ts  # MVP tour: sidebar, homebase, projects, library, settings.
│   ├── tour.project-create.ts      # Future tour: create project flow.
│   ├── tour.estimate-sheet.ts      # Future tour: estimate tree, grid editing, library insert.
│   └── tour.library-browse.ts      # Future tour: component catalog, search, variants.
├── hooks/
│   ├── useOnboardingState.ts       # Reads persisted tour completion from Supabase.
│   └── useOnboardingTourController.ts  # Joyride controlled-mode state, step navigation, finish/skip.
├── services/
│   ├── onboardingPersistence.ts    # Supabase reads/writes for user_onboarding_tours.
│   └── onboardingEvents.ts         # Optional: tour start/step/complete/skip event hooks.
└── types.ts                        # Tour, TourStep, TourCompletion, TourEvent types.
```

**Runtime flow:**

1. `WorkshopPageShell` renders `<OnboardingRuntime />` (client-only `'use client'`).
2. `OnboardingRuntime` checks `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED`. If `false`, renders null.
3. If enabled, calls `useOnboardingState(userId)` to fetch completion records from `user_onboarding_tours`.
4. Selects the active tour from `tourRegistry` based on current route (e.g., `/workshop` → `workspace.orientation`).
5. If the user has already completed this tour+version, skips (no render).
6. Otherwise, renders `<Joyride>` in controlled mode via `useOnboardingTourController`.
7. On finish or skip, calls `onboardingPersistence.markComplete()` to persist via Supabase.

**Persistence table (`user_onboarding_tours`):**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → `auth.users` |
| `workspace_id` | `uuid` | FK → `workspaces` |
| `tour_key` | `text` | Versioned key (e.g., `workspace.orientation.v1`) |
| `status` | `text` | `completed`, `skipped`, `dismissed` |
| `completed_steps` | `int` | Last step reached |
| `completed_at` | `timestamptz` | When tour was finished |
| `created_at` | `timestamptz` | Row creation |

RLS: users can only read/insert/update their own rows. No delete — tours persist for audit/replay logic.

**Feature flag:** `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` (default off). Follows the existing `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` pattern used in `WorkshopPageShell`.

## Strongest Implementation Recommendation

**Build the registry first, keep Joyride lazy, use Supabase for persistence, add a simple feature flag.**

1. **Registry first** (`tourRegistry.ts`, `tourTargets.ts`, `data-tour` constants). These are zero-dependency, zero-runtime TypeScript files. They can be merged into `main` before any package is installed. They define the contract that implementation phases build against.

2. **Joyride lazy-loaded and client-only.** `next/dynamic` with `ssr: false` inside `WorkshopPageShell`. Tour runtime never reaches the server bundle. If the feature flag is off, the dynamic import never executes — zero cost.

3. **Supabase persistence with RLS.** Use the existing Supabase client from `src/lib/supabase/`. The `user_onboarding_tours` table follows the existing pattern of RLS-enforced per-user tables. Completion state is server-authoritative — the client can request a mark but the database enforces `auth.uid() = user_id`.

4. **Feature flag as kill switch.** `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` gates everything. Setting it to `false` removes all onboarding runtime from the bundle. This is the same pattern already proven by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` and `ARCHESTIMATOR_AI_ENABLED`.

## Biggest Risk

**React Joyride compatibility with React 19.2.6 and Next.js 16.2.6 at the SSR/client boundary.**

React Joyride's step-based tooltip rendering and DOM targeting rely on browser APIs (`document.querySelector`, `getBoundingClientRect`, scroll position). Next.js 16's App Router with React Server Components introduces stricter SSR/client boundaries. The risk is that Joyride's internal `componentDidMount` or `useEffect` patterns conflict with RSC streaming or cause hydration mismatches.

**Mitigation:** Phase 1 installs the package behind the feature flag and renders a no-op Joyride instance (empty steps array) inside `WorkshopPageShell`. If this builds, passes `type-check`, and doesn't throw hydration errors, the risk is resolved. If it fails, the implementation switches to a custom lightweight tour system before any production code is written. **This verification happens before any tour content, target markers, or persistence work — zero sunk cost if the package doesn't work.**

Secondary risks:
- **Tour step fragility.** DOM selectors break when UI markup changes. Mitigation: `data-tour` attributes are explicit, searchable, and lintable. Phase 6 tests assert step targets resolve.
- **Concurrent tab behavior.** Two tabs might show the same tour. Mitigation: completion is persisted server-side after the first finish; the second tab picks up the completed state on next query.

## First Safe Implementation Slice

**Phase 1** is designed to be the safest possible first step:

- `bun add react-joyride` — install the package, verify the lockfile.
- Create `src/features/onboarding/` with a no-op `OnboardingRuntime` that renders `<Joyride steps={[]} run={false} />` behind the feature flag.
- Add `types.ts` with `Tour`, `TourStep`, and `TourCompletion` interfaces.
- Add `tourRegistry.ts` and `tourTargets.ts` as empty exports with documented constants.
- Wire `OnboardingRuntime` into `WorkshopPageShell` via `next/dynamic` with `ssr: false`.
- Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` (default) so the dynamic import never executes.

**Zero user-visible behavior.** The app looks and works identically. The Joyride package exists in `node_modules` but is never loaded in production. The feature folder exists but exports no runtime code. **Fully reversible** by reverting the commit — no migrations to roll back, no UI to regress.

Built code size impact: Joyride adds ~30KB gzipped to the client bundle only when the feature flag is `true`. At `false`, the `next/dynamic` import is tree-shaken. At `true`, the cost is paid once, shared across all workspace routes.

## Quality Gate

Every document in this planning folder must score **98+ on the quality scorecard** (document `20_quality_scorecard.md`). Documents below 98 are flagged for revision before this plan is considered ready for review.

## Next Action

**Implement Phase 1 only after review.** Do not install packages or create source files before this planning package is approved. Phase 0 is stakeholder review with an explicit go/no-go decision.
