# 13 — Performance & Bundle Analysis

> React Joyride onboarding tours for Archestimator workspace
> Status: pre-implementation analysis
> Date: 2026-06-03

---

## Bundle Impact of React Joyride

| Artifact | Size (estimated) | Notes |
|----------|-----------------|-------|
| `react-joyride` core | ~15 KB gzipped | The main library with tour logic, step management, overlay rendering |
| `scroll` (dependency) | ~2 KB gzipped | Smooth scrolling to tour targets |
| `tree-changes` (dependency) | ~1 KB gzipped | Deep comparison for prop changes |
| `react-floater` (transitive) | ~3 KB gzipped | Portal-based floating UI positioning |
| Misc utilities | ~2 KB gzipped | Popper positioning helpers, etc. |
| **Total estimated** | **~23 KB gzipped** | Acceptable for an authenticated workspace feature |

**Comparison to existing bundles:**
- Phosphor Icons (`@phosphor-icons/react`): already optimized via `optimizePackageImports` in `next.config.ts` (line 54)
- D3.js (used in charts): significantly larger (~80 KB gzipped), already accepted for workshop routes
- React Complex Tree 2: ~45 KB gzipped, loaded in workshop routes

**Conclusion:** React Joyride's bundle impact (~23 KB gzipped) is well within the acceptable range for the authenticated workspace. Public routes are unaffected (see isolation strategy below).

---

## How to Keep Joyride Out of Marketing and Public Routes

### Strategy: Conditional dynamic import with feature flag guard

```typescript
// src/components/workshop/WorkshopPageShell.tsx (server component)
import { isOnboardingToursEnabled } from '@/lib/onboarding/feature-flags';

// Feature flag check at the module level (tree-shakeable)
const OnboardingRuntime = isOnboardingToursEnabled()
  ? dynamic(
      () => import('@/features/onboarding/components/OnboardingRuntime'),
      { ssr: false }
    )
  : null;
```

### Why This Works (verified against Next.js 16.2.6 behavior)

1. **`dynamic()` with `ssr: false`** — Creates a client-only chunk that is never included in the server bundle. Archestimator already uses this pattern in `src/components/workshop/projects-page-client.tsx` (lines 43-44) for `NewProjectModal` and `ProjectDetailsModal`.

2. **Feature flag check at import level** — When `isOnboardingToursEnabled()` returns `false`, the `dynamic()` call never executes, and webpack/Next.js tree-shakes the entire import path. No Joyride code enters the bundle.

3. **Route isolation** — `WorkshopPageShell` is only rendered in `/workshop/*` routes (verified across 5 files: `workshop/page.tsx`, `workshop/projects/page.tsx`, `workshop/library/page.tsx`, `workshop/templates/page.tsx`, `workshop/feedback/page.tsx`). Public routes (landing, about, share, etc.) never import `WorkshopPageShell`.

4. **CSP enforcement** — `next.config.ts` enforces `Content-Security-Policy` on `/share/:path*` routes (line 77-88). Even if a bundle reference leaked into a share page, the browser's CSP would block execution.

5. **Bundle verification** — Archestimator uses `@next/bundle-analyzer` (imported in `next.config.ts` line 2). Running `ANALYZE=true bun run build` produces per-route chunk maps that can be inspected for accidental Joyride inclusion.

### Guarantees

| Guarantee | Mechanism | Verifiable via |
|-----------|-----------|---------------|
| Zero Joyride in public route bundles | `dynamic()` + feature flag + route isolation | `ANALYZE=true bun run build` |
| Zero Joyride code execution on public routes | CSP headers + no import path | Browser DevTools → Network tab → filter for Joyride chunks |
| Zero Joyride when feature flag is off | `isOnboardingToursEnabled()` returns `false` → `null` | Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`, build, verify |
| Zero performance impact on public routes | Code never loaded → zero bytes, zero CPU | Lighthouse on `/`, `/share/...` |

---

## Lazy-Loading Strategy

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Feature Gate                                    │
│ ─────────────────                                       │
│ isOnboardingToursEnabled() checks                       │
│ NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED env var             │
│ If false → bail immediately, zero imports                │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Route Gate                                      │
│ ─────────────────                                       │
│ WorkshopPageShell only renders in /workshop/* routes     │
│ Public routes never import the shell                     │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Auth Gate                                       │
│ ────────────────                                         │
│ Server actions call requireCurrentUserContext()          │
│ OnboardingRuntime checks auth state before mounting      │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Dynamic Import                                  │
│ ───────────────────────                                  │
│ next/dynamic with ssr: false                             │
│ Creates client-only chunk, lazy-loaded after hydration   │
├─────────────────────────────────────────────────────────┤
│ Layer 5: Graceful Fallback                               │
│ ────────────────────────                                 │
│ try/catch around dynamic import                          │
│ If import fails → null (no crash, no white screen)       │
│ If targets not found after 5s → skip tour               │
└─────────────────────────────────────────────────────────┘
```

### Graceful fallback implementation

```typescript
// In WorkshopPageShell.tsx
const OnboardingRuntime = isOnboardingToursEnabled()
  ? dynamic(
      () => import('@/features/onboarding/components/OnboardingRuntime')
        .catch(() => {
          // Import failed — silently skip onboarding
          console.warn('[Onboarding] Failed to load React Joyride, skipping tour');
          return { default: () => null };
        }),
      { ssr: false }
    )
  : null;
```

**Failure modes handled:**
- Network error during chunk download → `null` component (no tour, no crash)
- Chunk 404 (deployment mismatch) → `null` component
- Joyride internal error → React error boundary in `OnboardingRuntime` catches it
- Target element missing from DOM → tour step is skipped, tour continues or ends gracefully

---

## Client-Only Import Strategy

### Why Joyride must be client-only

React Joyride uses browser-only APIs:
- `document.querySelector()` — to find tour target elements
- `DOM events` (click, keydown, resize) — for navigation and spotlight positioning
- `MutationObserver` — to detect when target elements appear in the DOM
- `getBoundingClientRect()` — for spotlight/beacon positioning
- `window.scrollTo()` / `scrollIntoView()` — for smooth scrolling to targets

None of these APIs exist in the Node.js/server runtime. Attempting to import Joyride in a Server Component would crash the build.

### File-level strategy

| File type | Import location | Why |
|-----------|----------------|-----|
| Tour definitions (`src/features/onboarding/tours/*.ts`) | Can be imported anywhere (pure data, no React, no DOM) | Safe for server or client. These are plain objects/arrays. |
| Feature flags (`src/lib/onboarding/feature-flags.ts`) | Can be imported anywhere (env check only) | Safe for server or client. `process.env` is available in RSC and webpack-injected in client. |
| Server actions (`src/lib/onboarding/actions.ts`) | Server-only (`'use server'` directive) | Safe for server. Uses `requireCurrentUserContext()` which requires HTTP context. |
| Runtime components (`src/features/onboarding/components/*`) | Client-only via `dynamic()` with `ssr: false` | All Joyride/DOM usage is in these files. `'use client'` directive at top. |

---

## Hydration Considerations

### Joyride rendering lifecycle

```
Server renders HTML (no Joyride)
  ↓
Client hydrates React tree (no Joyride yet)
  ↓
dynamic() chunk loads (Joyride code arrives)
  ↓
OnboardingRuntime mounts (client only, post-hydration)
  ↓
Joyride creates portal → renders overlay + beacon into document.body
```

### Why no hydration mismatch

1. Joyride renders into a **React portal** (`ReactDOM.createPortal`), appending to `document.body`. Portal content is never part of the server-rendered HTML, so there's nothing to mismatch.

2. The `OnboardingRuntime` wrapping component returns `null` until it decides to show a tour. During SSR/hydration, it renders nothing → no mismatch.

3. All tour state (Zustand) is initialized client-side → no server/client state divergence.

### Suspense boundary interaction

Current `WorkshopPageShell` structure (verified from source, line 107):
```tsx
<Suspense fallback={<WorkshopShellContentFallback />}>
  {children}
</Suspense>
```

**OnboardingRuntime placement:**
- Mount **outside** the `<Suspense>` boundary (in the shell itself, not the content area)
- This ensures tour UI is available even while `{children}` is still loading
- Tour steps that target elements inside the Suspense boundary must wait for them to resolve

```
<WorkshopPageShell>
  <Sidebar />
  <OnboardingRuntime />   ← Outside Suspense, always mounted
  <Suspense fallback={...}>
    {children}            ← May be loading; tour waits for targets here
  </Suspense>
</WorkshopPageShell>
```

---

## Target Polling / Waiting Cost

### Strategy: MutationObserver with polling fallback

```
Priority 1: MutationObserver
  - Observe target container for DOM mutations
  - When target appears → resolve immediately
  - Cost: ~0 (browser-native, event-driven)

Priority 2: Polling fallback (if MutationObserver unavailable)
  - Interval: 100ms
  - Timeout: 5 seconds
  - Max checks: 50
  - Per check: document.querySelector('[data-tour="..."]') → ~0.1ms
  - Total CPU cost: ~5ms over 5 seconds
  - Negligible impact on frame budget (16ms per frame)

Priority 3: Give up after timeout
  - Skip the tour step (or entire tour)
  - Log warning for debugging
```

### Implementation sketch

```typescript
function waitForTarget(selector: string, timeoutMs = 5000): Promise<Element | null> {
  // Fast path: already in DOM
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    // Strategy 1: MutationObserver
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        const target = document.querySelector(selector);
        if (target) {
          observer.disconnect();
          resolve(target);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
      return;
    }

    // Strategy 2: Polling fallback
    const startTime = performance.now();
    const interval = setInterval(() => {
      const target = document.querySelector(selector);
      if (target) {
        clearInterval(interval);
        resolve(target);
      } else if (performance.now() - startTime > timeoutMs) {
        clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}
```

---

## Avoiding Route Transition Jank

Archestimator already has a navigation loading system:
- `NavigationListener` component (rendered in `AppProviders`, `src/app/providers.tsx` line 37)
- `RouteLoadingOverlay` component (rendered in `AppProviders`, line 38)
- `navigation-ui-store.ts` (Zustand store for loading state)

### Tour behavior during route transitions

| Event | Tour behavior |
|-------|--------------|
| User clicks a link (route transition starts) | Tour pauses immediately (overlay hidden, spotlight removed) |
| Route loading overlay is visible | Tour stays paused (no spotlight on loading overlay) |
| New route loads, Suspense resolves | Tour waits 500ms paint delay, then checks for targets |
| Targets found in new route | Tour resumes from current step |
| Targets not found in new route | Tour ends gracefully (step definition references a target on the previous page) |

**Implementation approach:** The `NavigationListener` already tracks route transitions. `OnboardingRuntime` subscribes to the navigation state and pauses/resumes accordingly.

### Avoiding layout thrashing

- `getBoundingClientRect()` calls for spotlight positioning are batched (one per step transition, not per frame)
- Scroll animation uses `requestAnimationFrame`-batched `scrollIntoView()` (browser-native, GPU-accelerated)
- Spotlight position is recalculated on `resize` (debounced 200ms) and `scroll` (passive listener)
- No synchronous layout reads in render cycle (all DOM reads in `useEffect`/event handlers)

---

## Avoiding Repeated DB Reads

### Data flow architecture

```
┌──────────────────────────────────────────────────────────┐
│ Server (Prefetch)                                         │
│ ────────────────                                          │
│ WorkshopPageShell (server component) prefetches           │
│ tour state for current user via server action             │
│ Passes initial data as prop to OnboardingRuntime          │
├──────────────────────────────────────────────────────────┤
│ Client (Cache)                                            │
│ ──────────────                                            │
│ TanStack Query caches the prefetched state                │
│ staleTime: 5 minutes (matches app default in providers)   │
│ Query key: ['onboarding-tour', tourKey]                   │
├──────────────────────────────────────────────────────────┤
│ Client (Runtime)                                          │
│ ────────────────                                          │
│ Zustand store holds: currentStep, isPaused, beaconPopped  │
│ Step transitions → Zustand only (no DB writes)            │
│ Status changes (started/completed/skipped) → DB upsert    │
└──────────────────────────────────────────────────────────┘
```

### When DB reads happen

| Trigger | DB read? | Frequency |
|---------|---------|-----------|
| Initial page load (workshop shell mounts) | YES (once) | 1 per session |
| User navigates between workshop pages | NO (from cache) | 0 |
| User starts a tour | NO (Zustand state change) | 0 |
| User advances to next step | NO (Zustand state change) | 0 |
| User completes a tour | NO (TanStack Query cache still fresh) | 0 |
| 5 minutes pass (staleTime exceeded) | YES (background refetch) | Rare |
| User explicitly refreshes | YES (new page load) | On refresh only |

### When DB writes happen

| Trigger | DB write? | Debounce? |
|---------|----------|-----------|
| Tour started | YES (upsert status=started) | Immediate (one-time) |
| Tour completed | YES (upsert status=completed) | Immediate (one-time) |
| Tour skipped | YES (upsert status=skipped) | Immediate (one-time) |
| Tour dismissed mid-way | YES (upsert status=skipped with current_step) | Immediate (one-time) |
| Every step advance | NO (Zustand only) | N/A — no writes on step change |

**Total DB writes per user per tour: 2-3 upserts** (one for start, one for complete/skip). This is negligible.

---

## TanStack Query Use Recommendation

**Decision: Use TanStack Query for onboarding tour server state.**

This matches the existing pattern — all server data in Archestimator flows through TanStack Query (`QueryClientProvider` in `src/app/providers.tsx` line 32). Benefits:

| Benefit | How it applies |
|---------|---------------|
| **Caching** | Tour state fetched once, cached for 5 minutes (matching `staleTime: 5 * 60_000` in `providers.tsx` line 16) |
| **Deduplication** | Multiple components asking for same tour state → single request |
| **Background refetch** | After 5 minutes, stale data is silently refreshed (user never sees loading state) |
| **Optimistic mutations** | `onMutate` immediately updates UI when user starts/completes tour, `onError` rolls back |
| **Pattern consistency** | Same as `useEstimateQuery`, `useProjectPresence`, and every other data-fetching hook |

### Query configuration

```typescript
// src/features/onboarding/hooks/useOnboardingTourState.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useOnboardingTourState(tourKey: string) {
  return useQuery({
    queryKey: ['onboarding-tour', tourKey],
    queryFn: () => getOnboardingTourState(tourKey), // server action
    staleTime: 5 * 60_000,     // 5 min (matches app default)
    gcTime: 5 * 60_000,        // 5 min (matches app default)
    refetchOnWindowFocus: false, // matches app default
    retry: 1,                   // matches app default
  });
}

export function useUpsertOnboardingTourState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertOnboardingTourState, // server action
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['onboarding-tour', variables.tourKey],
      });
    },
  });
}
```

### What is NOT in TanStack Query

Zustand handles runtime state that doesn't need persistence:
- `currentStep` (resets on page reload — user starts from beginning)
- `isPaused` (navigation overlay, route transitions)
- `beaconPopped` (first-time beacon already shown)
- `spotlightStyles` (derived from step definition + target position)

This split (TanStack Query for server state, Zustand for UI state) matches the existing architecture exactly.

---

## Performance Acceptance Criteria

| Criterion | Target | Measurement |
|-----------|--------|------------|
| Joyride bundle size added to /workshop | < 30 KB gzipped | `ANALYZE=true bun run build` → inspect workshop chunk |
| Joyride code in public route bundles | 0 bytes | `ANALYZE=true bun run build` → verify zero Joyride imports in public chunks |
| First Contentful Paint (FCP) impact | Unchanged (± 0 ms) | Lighthouse on /workshop with flag ON vs OFF (tour lazy-loads after mount) |
| Joyride lazy-load impact on page | < 50 ms after hydration | Performance observer on dynamic import chunk load |
| Synchronous layout thrashing | 0 forced reflows | React DevTools Profiler → no layout warnings |
| Tour start → Time to Interactive (TTI) impact | < 100 ms additional | Lighthouse with/without tour start |
| DB read: getOnboardingTourState | < 50 ms (single row, indexed) | Supabase query plan: `Index Scan using user_onboarding_tours_user_id_tour_key_idx` |
| DB write: upsertOnboardingTourState | < 100 ms (single row upsert) | Supabase query plan: single-row upsert on unique constraint |
| Lighthouse score on /workshop (flag ON) | Unchanged (± 2 points) vs flag OFF | Lighthouse CI in GitHub Actions |
| Memory: Joyride mounted but idle | < 5 MB additional heap | Chrome DevTools Memory profiler |

### Test plan

```bash
# 1. Bundle size verification
ANALYZE=true bun run build
# Inspect .next/analyze/client.html
# Verify: no react-joyride in public route chunks
# Verify: react-joyride only in workshop chunk
# Verify: workshop chunk delta < 30 KB gzipped

# 2. Public route isolation
bun run build
# Inspect .next/server/app/page.js (landing page)
# grep for "react-joyride" → should be absent
# Inspect .next/server/app/share/[token]/page.js
# grep for "react-joyride" → should be absent

# 3. Lighthouse
# Run with NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true
# Run with NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false
# Compare FCP, LCP, TTI, Speed Index → should be within ±2 points

# 4. DB performance
# EXPLAIN ANALYZE SELECT * FROM user_onboarding_tours WHERE user_id = '...' AND tour_key = '...';
# Expected: Index Scan, < 0.5ms
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Why avoid | Correct approach |
|-------------|-----------|-----------------|
| Importing Joyride in a server component | Crashes build (DOM APIs unavailable) | `dynamic(() => import(...), { ssr: false })` |
| Importing Joyride in `src/app/providers.tsx` | Loads on every page including public routes | Only import in `WorkshopPageShell` |
| Storing tour state in TanStack Query only | Over-fetching on every step transition | Zustand for runtime, TanStack Query for persistence |
| Polling for targets without MutationObserver | Wastes CPU on idle pages | MutationObserver first, polling as fallback |
| Writing to DB on every step advance | Unnecessary DB load | Write only on status changes (started/completed/skipped) |
| Rendering Joyride during SSR | Hydration mismatch, server crash | `ssr: false` + `'use client'` directive |
| Hard dependency on Joyride (no try/catch) | White screen if chunk fails to load | Graceful fallback to `null` component |
