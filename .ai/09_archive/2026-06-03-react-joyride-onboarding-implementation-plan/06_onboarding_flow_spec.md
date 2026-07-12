# 06 Onboarding Flow Specification

**Status:** Planning
**Created:** 2026-06-03
**Route/surface:** `/workshop/*` authenticated surfaces behind `WorkshopPageShell`

Defines exact onboarding behavior for ArchEstimator's React Joyride-based tour system. This document specifies states, transitions, persistence values, and behavioral contracts for every tour lifecycle event.

---

## State Machine

The onboarding runtime (`src/features/onboarding/components/OnboardingRuntime.tsx`, client-only via `next/dynamic` with `ssr: false`, mounted inside `WorkshopPageShell` at `src/components/workshop/WorkshopPageShell.tsx:86`) implements the following state machine:

### State Transition Diagram

```
idle ──(auth + route match + eligible)──▶ loadingUser
loadingUser ──(user loaded)──▶ loadingTourState
loadingUser ──(no user)──▶ idle
loadingTourState ──(state loaded)──▶ waitingForRoute
loadingTourState ──(error)──▶ idle (retry next visit)
waitingForRoute ──(route matches)──▶ waitingForTargets
waitingForRoute ──(route mismatch)──▶ idle
waitingForTargets ──(all targets found)──▶ ready
waitingForTargets ──(timeout)──▶ errored (target_not_found)
ready ──(auto-start trigger)──▶ running
ready ──(user dismisses)──▶ skipped
ready ──(flag turns off)──▶ idle
running ──(all steps complete)──▶ completed
running ──(user skips)──▶ skipped
running ──(error)──▶ errored
running ──(modal open | route change)──▶ paused
paused ──(resume condition met)──▶ running
paused ──(timeout 30s)──▶ skipped
completed ──(persist)──▶ idle
skipped ──(persist)──▶ idle
errored ──(log + persist)──▶ idle
```

### State Definitions

| State | Description | Entry Actions | Exit Actions |
|-------|-------------|---------------|--------------|
| `idle` | No tour active. Default state. `OnboardingRuntime` mounted but doing nothing. | Clear any stale timers, MutationObservers. Render null. | — |
| `loadingUser` | Fetching authenticated user context from `getCurrentUserContext()` (imported from `src/lib/auth/session.ts`). | Start user fetch. Render nothing (or skeleton if fetch exceeds 200ms). | — |
| `loadingTourState` | Fetching tour completion state from Supabase `user_onboarding_tours` via TanStack Query. | Start `useOnboardingState(userId)` query. Render nothing. | Cache query result for 30s staleTime. |
| `waitingForRoute` | Tour registered for current tour key but awaiting correct route match via `usePathname()` (Next.js navigation hook). | Subscribe to pathname changes. Return null until route matches. | Clear pathname subscription. |
| `waitingForTargets` | On correct route, polling DOM for all `data-tour` target elements. | Start MutationObserver + 100ms interval polling (5s timeout). | Clear observer and interval. |
| `ready` | All targets found in DOM, tour can auto-start. | Set `steps` array in Joyride controlled state. Optionally show subtle "Start tour" indicator. | — |
| `running` | Joyride actively rendering steps. Tour tooltip visible. | Activate Joyride `run={true}`. Start step-change listeners. | Deactivate Joyride `run={false}`. |
| `paused` | Tour temporarily suspended (modal open, route change). Spotlight hidden, tooltip hidden. | Pause Joyride. Store `lastCompletedStepIndex`. Start 30s pause timeout. | Clear pause timeout. Restore spotlight and tooltip position. |
| `completed` | User finished all tour steps. Terminal state before persistence. | Mark all steps as seen. Trigger persistence write. | — |
| `skipped` | User explicitly dismissed via "Skip" button on any step. | Immediately dismiss Joyride. Trigger persistence write with `status='skipped'`. | — |
| `errored` | Unrecoverable error (e.g., all targets missing, Joyride threw). | Log `onboarding_error` event. Persist error state. Do NOT auto-retry. | — |

---

## Status Values for Persistence

These values are written to `user_onboarding_tours.status` (text column, NOT NULL, CHECK constraint):

| Value | Meaning | Auto-Show Again? | Replay Available? |
|-------|---------|------------------|-------------------|
| `not_started` | User has never seen this tour key+version | Yes, on next route match | N/A (no row exists yet) |
| `in_progress` | User has started but not finished. `completed_steps` tracks last step index. | Resume from last step on next visit | No (resume takes priority) |
| `completed` | User finished all steps. `completed_at` set to NOW(). | No | Yes, from Settings → Onboarding |
| `skipped` | User explicitly clicked "Skip" on any step. `skipped_at` set to NOW(). | No (same tour key) | Yes, from Settings → Onboarding |
| `errored` | Tour entered unrecoverable error state. `error_message` column records details. | No (prevents retry loops) | Yes, from Settings → Onboarding |

### Decision: Skipped vs Completed

- **Skipped IS distinguishable from completed.** Different status values, different timestamps (`skipped_at` vs `completed_at`).
- **Skipped does NOT auto-show again** for the same tour key+version.
- **Both persist to DB** via `onboardingPersistence.markTourState()`.
- **Skipped tours are available for replay** from Settings → Onboarding (same as completed).

---

## Behavior Specifications

### User Eligibility

A user is eligible for a tour when ALL of these conditions are true:

1. **Authenticated.** Verified by `getCurrentUserContext()` returning a non-null user in `WorkshopPageShell` (called at `WorkshopPageShell.tsx:74-75`). Unauthenticated users on public routes never load `OnboardingRuntime` because `WorkshopPageShell` only renders on authenticated workshop routes.

2. **Feature flag enabled.** `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`. Follows the existing pattern established by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` in `WorkshopPageShell.tsx:81` (`isAskFlipUiEnabled()` check). When `false`, the `next/dynamic` import of `OnboardingRuntime` never executes — zero runtime cost.

3. **On a /workshop route.** `OnboardingRuntime` checks `usePathname()` against registered tour route patterns. Tours are route-scoped — the Workspace Orientation tour only activates on `/workshop`, not on `/workshop/projects`.

4. **Tour not yet completed or skipped for this user + tour key + version.** Checked against `user_onboarding_tours` rows filtered by `user_id = auth.uid() AND tour_key = $key`. Status `completed` or `skipped` → ineligible. Status `not_started` (no row) → eligible. Status `in_progress` → eligible for resume.

### First-Login Behavior

Sequence for a brand-new user authenticating for the first time:

1. **User authenticates** via Google OAuth or magic link (handled by Supabase Auth, redirect configured in `src/lib/auth/redirects.ts:1`: `DEFAULT_AUTH_DESTINATION = "/workshop"`).

2. **Redirected to `/workshop`.** The `resolvePostAuthDestination()` function in redirects.ts routes successful auth to `/workshop`. Pending-invite flows may override this destination, but standard first-login lands here.

3. **`WorkshopPageShell` renders** (server component at `src/components/workshop/WorkshopPageShell.tsx`). Calls `getCurrentUserContext()` at line 74, passes user to `MainSidebar` at line 87.

4. **`OnboardingRuntime` mounts** (client component, lazy-loaded via `next/dynamic` with `ssr: false` inside `WorkshopPageShell`). The dynamic import only resolves when `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`.

5. **Runtime checks eligibility:** user authenticated → `useOnboardingState()` fetches from `user_onboarding_tours` (no rows for new user) → tour state is `not_started` → route matches `/workshop` → all `data-tour` targets found in DOM → transition to `ready` state.

6. **Workspace Orientation tour auto-starts.** `ready` transitions to `running`. Joyride renders first step with spotlight on `[data-tour="ae-tour-workspace-shell"]`.

7. **Steps guide user through:** workspace shell anatomy → sidebar navigation (Workshop, Projects, Components, Templates, Settings) → homebase bento cards → footer (feedback, AI assistant if enabled).

8. **On completion:** last step shows "Done" button. Clicking "Done" calls `onboardingPersistence.markComplete({ tourKey: 'first_workspace_orientation_v1', status: 'completed' })` which upserts into `user_onboarding_tours` with `status='completed', completed_at=NOW()`. RLS enforces `auth.uid() = user_id`.

9. **On skip:** any-step "Skip" button calls `onboardingPersistence.markTourState({ tourKey: 'first_workspace_orientation_v1', status: 'skipped', skipped_at: NOW() })`. Tour immediately dismisses. Same RLS enforcement.

### Returning-User Behavior

On each `/workshop` visit after first login:

```
OnboardingRuntime mounts
  → useOnboardingState() queries user_onboarding_tours
    → tour status = 'completed': render null, do nothing
    → tour status = 'skipped': render null, do nothing
    → tour status = 'in_progress': resume from lastCompletedStep (if < 30s since pause timeout)
    → tour status = 'not_started' (no row): if newer tour version exists → offer new tour
    → no row for any version: eligible for default tour
```

**Edge case: stuck in_progress.** If a user started a tour, navigated away mid-step, and the 30s pause timeout expired (transitioning to `skipped`), the row is `skipped`. On revisit, treated as skipped — no auto-show. The `in_progress` state is for active session resumption only.

### Skip Behavior

- **Every tooltip** includes a "Skip" button in the tooltip footer, positioned to the left of the "Next"/"Done" button.
- **Clicking skip** immediately:
  1. Calls `Joyride` `callback` with `action='skip'` and `type='step:before'`.
  2. Transitions state to `skipped`.
  3. Calls `onboardingPersistence.markTourState({ tourKey, status: 'skipped', skipped_at: new Date().toISOString() })`.
  4. Joyride `run` set to `false` → tooltip + spotlight removed.
- **Persists `status='skipped', skipped_at=NOW()`** to `user_onboarding_tours`.
- **Does NOT auto-show again** for same tour key+version. Checked on every `OnboardingRuntime` mount.
- **Available for replay** from Settings → Onboarding → select tour → "Replay".

### Completed Behavior

- **Last step** shows "Done" button instead of "Next" button. Controlled by `isLastStep()` check in `useOnboardingTourController`.
- **Clicking "Done"** triggers:
  1. Joyride `callback` with `action='next'` on last step.
  2. Transitions to `completed`.
  3. Calls `onboardingPersistence.markTourState({ tourKey, status: 'completed', completed_at: new Date().toISOString(), completed_steps: totalSteps })`.
  4. Joyride `run` set to `false`.
- **Persists `status='completed', completed_at=NOW()`** to `user_onboarding_tours`.
- **Does NOT auto-show again.**
- **Available for replay** from Settings → Onboarding.

### Replay Behavior

- **Trigger:** User navigates to `/workshop/settings` → Onboarding section → sees list of tours with status (not_started, completed, skipped) → clicks "Replay" on a completed or skipped tour.
- **System does NOT delete the persistence row.** Instead:
  1. `onboardingPersistence.resetTourState({ tourKey })` sets an in-memory flag on the query client.
  2. TanStack Query `invalidateQueries(['user_onboarding_tours', userId])` refetches.
  3. `useOnboardingState()` returns `status='replaying'` for that tour key.
  4. Tour controller starts from step 1 regardless of prior completion/skip.
- **On completion during replay:** `onboardingPersistence.markTourState()` upserts the existing row (ON CONFLICT (user_id, tour_key) DO UPDATE) — updates `status='completed'`, `completed_at=NOW()`, `completed_steps` to total, clears any prior `skipped_at`.
- **On skip during replay:** Same upsert but sets `status='skipped'`, `skipped_at=NOW()`.
- **Replay state resets on page unload** (in-memory only) — on next visit, the persisted `completed` or `skipped` status takes precedence again.

### Route-Change Behavior

- **`OnboardingRuntime` subscribes to `usePathname()`** (Next.js navigation hook, same pattern used by `MainSidebar` at `src/components/sidebar/MainSidebar.tsx:63`).
- **If user navigates away mid-tour:**
  1. Pathname change detected.
  2. Transition to `paused` state.
  3. Store `lastCompletedStepIndex` from Joyride controlled state.
  4. Start 30s pause timeout.
- **If new route matches a different registered tour:** Do NOT auto-start the different tour. Pause takes priority. The `paused` tour may resume or time out before any new tour is considered.
- **If user returns to original route within 30s:**
  1. Pathname matches original tour route.
  2. Transition from `paused` → `waitingForTargets` → `ready` → `running`.
  3. Resume from `lastCompletedStepIndex`.
- **If 30s timeout expires:** Transition `paused` → `skipped`. Persist skip. Treat as user abandonment.
- **Route-change during step animation:** Cancel CSS transition on spotlight element. Clean up any in-progress tooltip enter/exit animations. Set Joyride `run={false}` before pausing.

### Missing-Target Behavior

- **On step advance:** `useOnboardingTourController` calls `document.querySelector('[data-tour="..."]')` or uses the Joyride `getStepTargetNode` callback to verify target exists in DOM.
- **If target missing:**
  1. Log `onboarding_target_missing` event with `{ tourKey, stepIndex, targetSelector, timestamp }`.
  2. Skip that step (Joyride `stepIndex + 1`).
  3. Continue to next step.
- **If ALL targets missing** (entire DOM surface removed or not rendered):
  1. Transition to `errored` state.
  2. Log `onboarding_all_targets_missing` event.
  3. Persist error state to DB.
  4. Do NOT crash the page. Do NOT freeze. `OnboardingRuntime` renders null.
- **Target resolution uses `data-tour` attribute directly.** The step configuration references `target: '[data-tour="ae-tour-workspace-shell"]'`. No CSS class selectors, no fragile nth-child paths.

### Slow-Network Behavior

- **Tour state fetch** (`useOnboardingState` via TanStack Query) times out after **5 seconds**.
  - On first timeout: transition to `idle`. Schedule retry on next `/workshop` visit.
  - On second timeout: transition to `idle`. Treat as `not_started` (no row) — show tour anyway (graceful degradation). The user might see a tour they already completed, but never gets stuck waiting.
- **TanStack Query configuration:**
  - `staleTime: 30_000` (30 seconds) — cached result reused within same session.
  - `retry: 1` — one automatic retry before falling through.
  - `refetchOnWindowFocus: false` — no refetch on tab switch, avoids redundant network calls.
- **Default behavior on fetch failure:** Show the tour. It's better to show a tour that might be redundant than to block the user from seeing one they genuinely need.

### Modal Behavior

- **If a modal opens during tour** (e.g., `NewProjectModal` rendered at `src/components/workshop/projects-page-client.tsx:43` via `dynamic(() => import("./NewProjectModal"))`):
  1. Detect modal open via a `data-modal-open` attribute on `<body>` or a `useModalOpenState()` hook.
  2. Transition to `paused`.
  3. Joyride spotlight and tooltip hidden (z-index conflict with modal backdrop).
- **Z-index management:** Joyride spotlight defaults to z-index 100. Modals in Archestimator use z-index 50 (based on Tailwind `z-50` pattern in codebase). Configure Joyride `spotlightPadding={0}` and set `styles.overlay` to use z-index below modal backdrop. Custom `OnboardingTooltip` component uses z-index above modal backdrop when targeting modal-internal elements.
- **Do NOT show tour steps inside modals** unless the step explicitly targets a modal element (e.g., `data-tour="ae-tour-new-project-name"` inside `NewProjectModal`). The tour definition must include `disableScrolling: false` for modal steps.
- **On modal close:** Transition `paused` → `waitingForTargets` → `ready` → `running`. Resume from `lastCompletedStepIndex`.

### Mobile Behavior (< 1024px / `lg` breakpoint)

Code evidence from `WorkshopPageShell.tsx:89`:

```tsx
<section className="flex h-full min-h-0 flex-col lg:pl-[64px]" ...>
```

And `MainSidebar.tsx` uses:
- `lg:flex` (visible on desktop)
- `hidden lg:block` pattern for sidebar elements

**Behavior:**

- **Sidebar is hidden below `lg` breakpoint.** The `MainSidebar` uses collapsed mode on mobile with only icon hints. Full sidebar labels are not visible.
- **Tours MUST handle missing sidebar targets gracefully.** Steps targeting sidebar elements (`ae-tour-main-nav-workspace`, `ae-tour-main-nav-projects`, etc.) will fail target resolution. The missing-target behavior (skip step, log event) handles this automatically.
- **Consider skipping sidebar-related steps entirely on mobile.** The tour definition can include a `showOnMobile?: boolean` flag per step. Steps with `showOnMobile: false` are filtered from the steps array when `window.innerWidth < 1024`.
- **Tooltip placement:** Prefer `'bottom'` or `'auto'` on mobile (via `placement: 'auto'` in Joyride step config). Avoid `'left'` and `'right'` placements that may overflow the viewport.
- **Spotlight:** Keep enabled on mobile for tap targets. Do not use `spotlightClicks: true` (conflicts with mobile touch).

### Reduced-Motion Behavior

Code evidence from `MainSidebar.tsx:74-76`:

```tsx
const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
  typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);
```

**Behavior:**

- **Check `prefers-reduced-motion: reduce`** using the same pattern as `MainSidebar.tsx:74-76` — `useState` initializer reading `window.matchMedia(...)`, plus a `useEffect` listener for live changes.
- **Disable spotlight animation.** Set Joyride `disableScrolling={false}` to avoid auto-scroll animations. Set `styles.overlay` with `transition: 'none'`.
- **Disable step transition animations.** Custom `OnboardingTooltip` component applies `opacity-100` immediately (no fade-in). Spotlight applies instantly (no scale-in).
- **Use `disableScrolling={false}`** for reduced motion, as auto-scrolling can be disorienting. Instead, rely on the existing scroll position (the target should already be in view if the user is on the correct page).
- **Do NOT skip the tour entirely.** Users with reduced motion preferences still benefit from guided onboarding — just without motion.

### Versioned Tour Behavior

- **Each tour has a key+suffix** like `first_workspace_orientation_v1`.
- **New version (`_v2`) is treated as a NEW tour:**
  - Different `tour_key` value in `user_onboarding_tours`.
  - Both `_v1` and `_v2` rows can coexist in DB.
  - If `_v1` has `status='completed'` but `_v2` exists and has no row (or `not_started`): offer `_v2`.
- **Version bump criteria:**
  - Tour step reorder → new version.
  - Step added/removed → new version.
  - Target selector changed → new version.
  - Copy changes only → same version (update step `content` in tour definition, no version bump).
- **Deprecation:** Old tour versions with no route match (route pattern removed from tour registry) are never offered. Existing rows in DB remain for historical audit but are inactive.

### Future New-Tour Behavior

- **Adding a new tour definition** to `tourRegistry.ts` auto-enables it for all eligible users.
- **Existing users who completed all prior tours** will see the new tour on first visit to its matching route.
- **No migration needed for new tours.** Just add:
  1. Tour definition file (e.g., `src/features/onboarding/config/tour.estimate-sheet.ts`).
  2. Register in `tourRegistry.ts`.
  3. Add `data-tour` targets to relevant components.
  4. Deploy.
- **No schema migration.** `user_onboarding_tours` column `tour_key` accepts any string matching the `[a-z0-9_]+_v[0-9]+` naming convention.

---

## Error Handling

| Error Scenario | Behavior | Recovery |
|---------------|----------|----------|
| Joyride dynamic import fails (network error, version mismatch) | Catch in `next/dynamic` error boundary. Log error. Set `errored` state. `OnboardingRuntime` renders null. | User must reload page. No auto-retry to avoid infinite loops. |
| Supabase `user_onboarding_tours` write fails | Retry once with exponential backoff (1s delay). If still fails: log error, show tour as transient (persist on next page load via in-memory queue flushed by `useOnboardingState` on next mount). | On next `WorkshopPageShell` mount, `useOnboardingState` checks in-memory queue, retries write. If DB is down, tours remain non-persistent but functional for the session. |
| Supabase `user_onboarding_tours` read fails | TanStack Query `retry: 1`, then treat as `not_started` (no row). Show tour. | Next visit: query again (30s staleTime expired). |
| Target selector broken by DOM change | Missing-target behavior: skip step, log event. | Tour continues with remaining steps. If all targets missing → `errored`. |
| Joyride throws during step render | Catch in error boundary wrapping `OnboardingRuntime`. Log error with stack trace. Transition to `errored`. | No auto-retry. User sees normal workspace without tour. |
| Joyride callback receives unexpected `action`/`type` | Log unexpected event. Fall through to no-op. Do not crash. | Tour continues. Unknown actions ignored. |
| Pause timeout fires during route already matched | Check current pathname before transitioning `paused` → `skipped`. If pathname matches tour route, cancel timeout and resume. | Tour resumes from paused step. |

### Error State Persistence

When transitioning to `errored`, persist to DB:

```typescript
onboardingPersistence.markTourState({
  tourKey,
  status: 'errored',
  error_message: `target_not_found: ${missingTargets.join(', ')}`,
  error_at: new Date().toISOString(),
});
```

The `errored` status prevents auto-retry (same as `completed`/`skipped`), but allows manual replay from Settings → Onboarding.

---

## Event Logging

All onboarding events use a structured log contract. In production, these route through a lightweight `onboardingEvents.log()` service that can be swapped for an analytics provider later.

| Event | When | Payload |
|-------|------|---------|
| `onboarding_tour_started` | Transition `ready` → `running` | `{ tourKey, userId, timestamp }` |
| `onboarding_step_viewed` | Each step becomes active | `{ tourKey, stepIndex, stepTitle, timestamp }` |
| `onboarding_step_completed` | User clicks "Next" | `{ tourKey, stepIndex, stepTitle, timestamp }` |
| `onboarding_tour_completed` | Transition `running` → `completed` | `{ tourKey, userId, totalSteps, durationMs, timestamp }` |
| `onboarding_tour_skipped` | Transition `running` → `skipped` | `{ tourKey, userId, lastStepIndex, timestamp }` |
| `onboarding_tour_paused` | Transition `running` → `paused` | `{ tourKey, lastStepIndex, reason: 'modal' \| 'route_change', timestamp }` |
| `onboarding_tour_resumed` | Transition `paused` → `running` | `{ tourKey, lastStepIndex, timestamp }` |
| `onboarding_target_missing` | Step target not found in DOM | `{ tourKey, stepIndex, targetSelector, timestamp }` |
| `onboarding_all_targets_missing` | All tour targets missing | `{ tourKey, route, timestamp }` |
| `onboarding_tour_errored` | Transition to `errored` | `{ tourKey, errorType, errorMessage, timestamp }` |
| `onboarding_replay_started` | User initiates replay | `{ tourKey, userId, previousStatus, timestamp }` |

No analytics provider integration in Phase 1. Events are `console.info`-level in development, no-op in production. Provider integration is a future work item.

---

## TypeScript Types

From `src/features/onboarding/types.ts`:

```typescript
export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'errored';

export type OnboardingState =
  | 'idle'
  | 'loadingUser'
  | 'loadingTourState'
  | 'waitingForRoute'
  | 'waitingForTargets'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'skipped'
  | 'errored';

export type OnboardingEvent =
  | { type: 'AUTH_READY'; userId: string }
  | { type: 'AUTH_UNAVAILABLE' }
  | { type: 'TOUR_STATE_LOADED'; status: TourStatus; lastStep?: number }
  | { type: 'TOUR_STATE_ERROR'; error: Error }
  | { type: 'ROUTE_MATCHED'; tourKey: string }
  | { type: 'ROUTE_MISMATCHED' }
  | { type: 'TARGETS_FOUND' }
  | { type: 'TARGETS_TIMEOUT'; missingTargets: string[] }
  | { type: 'AUTO_START' }
  | { type: 'USER_DISMISSED' }
  | { type: 'ALL_STEPS_COMPLETE' }
  | { type: 'USER_SKIPPED' }
  | { type: 'TOUR_ERROR'; error: Error }
  | { type: 'MODAL_OPENED' }
  | { type: 'MODAL_CLOSED' }
  | { type: 'ROUTE_CHANGED' }
  | { type: 'ROUTE_RESTORED' }
  | { type: 'PAUSE_TIMEOUT' }
  | { type: 'FLAG_DISABLED' }
  | { type: 'REPLAY_REQUESTED'; tourKey: string };

export type TourCompletionRecord = {
  id: string;
  user_id: string;
  workspace_id: string;
  tour_key: string;
  status: TourStatus;
  completed_steps: number;
  completed_at: string | null;
  skipped_at: string | null;
  error_message: string | null;
  error_at: string | null;
  created_at: string;
  updated_at: string;
};
```

---

## References

| Reference | File |
|-----------|------|
| Shell component | `src/components/workshop/WorkshopPageShell.tsx` |
| Auth user context | `src/lib/auth/session.ts` (`getCurrentUserContext()`) |
| Auth redirect destination | `src/lib/auth/redirects.ts:1` (`DEFAULT_AUTH_DESTINATION = "/workshop"`) |
| Feature flag pattern | `WorkshopPageShell.tsx:81` (`isAskFlipUiEnabled()` / `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`) |
| Sidebar reduced motion | `src/components/sidebar/MainSidebar.tsx:74-76` |
| Next.js pathname hook | `usePathname()` used by `MainSidebar.tsx:63` |
| TanStack Query pattern | Existing usage in `src/hooks/use-estimate-query.ts` |
| Dynamic import pattern | `next/dynamic` in `WorkshopPageShell` (footer assistant), `projects-page-client.tsx:43` (`NewProjectModal`) |
| Tour registry | `src/features/onboarding/config/tourRegistry.ts` (to be created) |
| Target constants | `src/features/onboarding/config/tourTargets.ts` (to be created) |
