# 08 — Security, Performance & Data Plan

**Date:** 2026-06-03 (refined)
**Source:** Consolidated from `12_security_and_privacy_analysis.md` + `13_performance_and_bundle_analysis.md` + `08_database_and_persistence_plan.md`

---

## Security

### Auth & Authorization

- **Identity source:** `getCurrentUserContext()` from `src/lib/auth/session.ts` — returns `CurrentUserContext | null` with `userId`, `workspaceId`, `email`, `role`
- **Auth gate:** `requireCurrentUserContext()` redirects to `/login` if null — enforced by `proxy.ts` middleware for all `/workshop` routes
- **Server-action auth:** Persistence operations extract `userId` from `getCurrentUserContext()` — client cannot forge identity
- **No anonymous writes:** All `user_onboarding_tours` mutations require authenticated user

### RLS (Row-Level Security)

```sql
ALTER TABLE user_onboarding_tours ENABLE ROW LEVEL SECURITY;

-- Users can read only their own tour rows
CREATE POLICY "Users can read own tour rows"
  ON user_onboarding_tours FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tour rows
CREATE POLICY "Users can insert own tour rows"
  ON user_onboarding_tours FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tour rows
CREATE POLICY "Users can update own tour rows"
  ON user_onboarding_tours FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy — rows persist for audit
```

### Data Stored vs Not Stored

| Stored | NOT Stored |
|--------|------------|
| Tour key + version | Raw tour step content (stored in code, not DB) |
| Completion status (not_started/started/completed/skipped) | User interaction timestamps per step |
| Current step index | Tooltip hover/click events |
| Start/complete/skip timestamps | Which options user selected in tooltip |
| User ID (FK to auth.users) | IP address or browser fingerprint |
| Workspace ID (nullable FK) | Analytics/tracking data |
| Metadata JSON (extensible, empty by default) | Screen recordings or session replays |

### Input Validation

- `tour_key`: validated against registered tour keys in `tourRegistry` before persistence
- `tour_version`: positive integer
- `status`: constrained by DB CHECK constraint (`not_started`, `started`, `completed`, `skipped`)
- `current_step`: validated against tour's total steps count
- All writes go through server actions — client-requested values validated server-side

### Secrets & Environment

- `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` — safe to expose (boolean feature flag)
- `SUPABASE_SERVICE_ROLE_KEY` — NEVER exposed to client. Used server-side only for persistence.
- No new secrets required for onboarding system
- No API keys, tokens, or credentials in onboarding code

### Abuse Cases

| Abuse | Prevention |
|-------|------------|
| User rapidly completes/skips tour to flood DB | UPSERT with UNIQUE constraint — one row per user+tour+version |
| User tries to read another user's tour state | RLS: `auth.uid() = user_id` |
| User forges completion status via client | Server action validates `userId` from `getCurrentUserContext()`, not request body |
| Bot/proxy enumerates tour endpoints | Rate-limited by existing Supabase RLS + Auth rate limits |
| User modifies `data-tour` attributes to break targeting | Tour gracefully skips missing targets — no error, no crash |

---

## Performance

### Bundle Size Budget

| Component | Size (gzipped) | When Loaded |
|-----------|---------------|-------------|
| react-joyride | ~25-30KB | Only when flag=true AND user visits /workshop |
| OnboardingRuntime + hooks | ~5-8KB | Same as above |
| Tour definitions (workspace.orientation) | ~2-3KB | Same as above |
| **Total onboarding payload** | **~32-41KB** | Authenticated workspace only |

**Budget:** <45KB gzipped total for onboarding. Verified via `ANALYZE=true bun run build`.

### Lazy-Loading Strategy

```typescript
// In WorkshopPageShell — ONLY when flag is true:
const OnboardingRuntime = dynamic(
  () => import('@/features/onboarding/components/OnboardingRuntime'),
  { ssr: false }
);

// When flag is false, the dynamic() call never executes.
// Joyride code is tree-shaken from the initial bundle.
```

**Layers of protection:**
1. Feature flag check prevents `dynamic()` call
2. `dynamic()` with `ssr: false` prevents server-side execution
3. React.lazy-like code splitting — Joyride in separate chunk
4. Chunk only downloaded when user navigates to `/workshop`

### Hydration Safety

- `OnboardingRuntime` is client-only — never renders on server
- No onboarding markup in SSR HTML → zero hydration mismatch risk
- Tour starts AFTER hydration (controlled mode, `run={shouldRun}` set post-mount)

### Suspense Coordination

- `OnboardingRuntime` wrapped in existing `WorkshopPageShell` Suspense boundary
- If Joyride chunk is slow to load, workspace content renders first, tour appears when ready
- No blocking of initial workspace render

### TanStack Query Caching

- `useOnboardingState` uses `queryKey: ['onboarding', userId, tourKey]`
- `staleTime: 5 * 60 * 1000` (5 minutes) — tour state unlikely to change within session
- `refetchOnWindowFocus: true` — picks up completion from other tabs
- On complete/skip: `queryClient.invalidateQueries({ queryKey: ['onboarding'] })` — refreshes immediately

### Performance Acceptance Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial bundle increase (flag=false) | 0KB | `ANALYZE=true bun run build` |
| Onboarding chunk size (flag=true) | <45KB gzipped | Build analyzer |
| Lighthouse TBT regression on /workshop | <+50ms | Chrome DevTools Lighthouse |
| First tour step visible after page load | <2s after hydration | Manual timing |
| Step transition latency | <100ms | Joyride controlled mode is synchronous |

---

## Data Plan

### Persistence Architecture

```
Client (OnboardingRuntime)
  ↓ complete/skip/replay
  ↓
Server Action (onboardingPersistence.upsertTourState)
  ↓ validates userId from getCurrentUserContext()
  ↓
Supabase (user_onboarding_tours)
  ↓ RLS: auth.uid() = user_id
  ↓ UNIQUE(user_id, workspace_id, tour_key, tour_version)
  ↓
Response → TanStack Query cache update
```

### Why Relational Table Over Profile Metadata

| Approach | Pros | Cons |
|----------|------|------|
| **Dedicated table** | Proper indexing, versioned keys, clean RLS, easy to query "which tours has user X completed?" | One more table, one more migration |
| **Profile metadata JSON** | No new table | Hard to query, no constraints, no version isolation, JSON bloat |
| **localStorage only** | Zero server cost | Lost on clear, no cross-device, no RLS, no audit |

**Verdict: Dedicated table.** Follows existing ArchEstimator pattern (48 tables, all with RLS).

### Server Actions vs API Routes

**Verdict: Server Actions.** ArchEstimator uses server actions for all data mutations (`src/lib/*/actions.ts`). Onboarding persistence follows this pattern:
- `markTourComplete(tourKey, tourVersion, currentStep)` — server action
- `markTourSkipped(tourKey, tourVersion)` — server action
- `getUserTourState(userId, tourKey)` — server action (or TanStack Query + repository)
- `resetTourForReplay(tourKey, tourVersion)` — server action

### localStorage Role

**Transient fallback only, NOT source of truth.** During first page load, before TanStack Query fetches from Supabase, localStorage MAY cache the last known tour state to prevent flash of tour start. Once Supabase response arrives, server state overrides localStorage.

```typescript
// Pattern (pseudocode):
const localState = localStorage.getItem(`onboarding:${tourKey}`);
const { data: serverState } = useQuery(...);
const effectiveState = serverState ?? localState; // server wins
```

### Migration Naming

```
supabase/migrations/YYYYMMDDHHMMSS_user_onboarding_tours.sql
```

Follows existing migration naming convention. Migration includes:
- CREATE TABLE with all columns, constraints, defaults
- CREATE UNIQUE INDEX on (user_id, workspace_id, tour_key, tour_version)
- ENABLE ROW LEVEL SECURITY
- CREATE POLICY statements (SELECT, INSERT, UPDATE)
- CREATE TRIGGER for `updated_at` auto-update (if following existing pattern)

### Privacy

- Tour completion data is low-sensitivity (which tours a user has seen)
- No PII beyond `user_id` (UUID reference to auth.users)
- No IP addresses, browser fingerprints, or device data
- No analytics or tracking embedded in tour events
- `onboardingEvents.ts` is a no-op abstraction — future analytics integration point, not active
- No data shared with third parties
- No data used for advertising or marketing

### archestimator / Supabase Boundaries

- **NEVER touch archestimator Supabase resources**
- **Only ArchEstimator Supabase project `ebxxqidacheyapmmzavr`** may be referenced
- **Do not claim linked Supabase state** from local-only evidence — migration parity must be verified
