# 12 — Security & Privacy Analysis

> React Joyride onboarding tours for Archestimator workspace
> Status: pre-implementation analysis
> Date: 2026-06-03

---

## Data Stored in Onboarding Persistence

```sql
CREATE TABLE user_onboarding_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key TEXT NOT NULL,              -- e.g. "first_workspace_orientation_v1"
  tour_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'started', 'completed', 'skipped')),
  current_step INTEGER,                -- nullable, 0-indexed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, tour_key)  -- one state row per user per tour
);
```

**Rationale for each column:**
| Column | Justification |
|--------|--------------|
| `user_id` | Required to scope tour state to a single authenticated user. Foreign key to `auth.users(id)` ensures referential integrity; `ON DELETE CASCADE` cleans up when accounts are removed. |
| `tour_key` | Stable string identifier (e.g. `"first_workspace_orientation_v1"`) — naming convention includes a version suffix so we can ship a new tour variant without migrating old state. |
| `tour_version` | Integer discriminator for tour definition changes. Client uses this to decide whether a user's saved `current_step` is still valid against the current tour definition. |
| `status` | Enum with four lifecycle states. `not_started` (default) means the tour is available but never initiated; `started` means the user is mid-tour; `completed` means they finished; `skipped` means they explicitly dismissed. |
| `current_step` | Nullable integer tracking the last-reached step index. Null when `not_started` or `skipped`. Useful for resuming a partially-completed tour. |
| `started_at`, `completed_at`, `skipped_at` | Individual timestamps support analytics (future) and allow the UI to show "Started 3 days ago" messaging. |
| `last_seen_at` | Updated on every state write. Supports "show again after N days" logic and stale-state cleanup. |
| `metadata` | JSONB extension point for future needs (e.g., A/B experiment group, tour variant, locale). Defaults to `'{}'`. Value is never used for security decisions. |

---

## Data That Must NOT Be Stored

| Prohibited data | Why | How enforced |
|----------------|-----|-------------|
| Passwords, tokens, or secrets | Security-critical | Schema has no column for this; column-level audit in CI |
| Email addresses | PII duplication | `user_id` references `auth.users` but we never duplicate email. No email column. |
| Project data, estimate data, or financial data | Business-sensitive | Schema contains only tour state; no FK to project/estimate tables |
| IP addresses | PII, unnecessary | No `ip_address` column; never logged by tour actions |
| Browser fingerprint data | Privacy-invasive | Tour never accesses `navigator` APIs beyond feature detection |
| Page content or DOM snapshots | Privacy-invasive | Tour only records step index (integer), not DOM state |
| User input from estimate fields | Accidental data capture | Tour step definitions are statically authored strings; no `innerText`/`value` capture |
| Screenshot data | Privacy-invasive, large payload | Tour renders overlays; no image/screenshot capture |
| Workspace-level data | Cross-tenant leakage | No `workspace_id` column; tour state is purely user-scoped |

**Design principle:** The onboarding persistence layer is a *signal tracker* — it records *what* a user has seen (tour key + step index + status), not *what* they were looking at. This is the same principle used by every major SaaS onboarding tool (Appcues, Userflow, Intercom Product Tours).

**CI enforcement:** A migration lint rule in `scripts/` should verify that `user_onboarding_tours` never gains columns referencing `projects`, `estimates`, `cost_library_items`, or any other business-data table.

---

## User Identity and RLS Concerns

### Pattern from existing codebase

Archestimator enforces user identity in every server action via `requireCurrentUserContext()`. This pattern is used across the codebase (verified on 2026-06-03):

```typescript
// Pattern from src/lib/workshop/beta-feedback-actions.ts (line 5)
import { requireCurrentUserContext } from "@/lib/auth/session";

// Pattern from src/lib/component-library/actions.ts (line 5)
import { requireCurrentUserContext } from "@/lib/auth/session";

// Pattern from src/lib/ai/package-builder/apply.ts (line 7)
import { requireCurrentUserContext } from "@/lib/auth/session";
```

**All onboarding server actions MUST follow this pattern:**

```typescript
// src/lib/onboarding/actions.ts
'use server';

import { requireCurrentUserContext } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function upsertOnboardingTourState(input: {
  tourKey: string;
  tourVersion: number;
  status: 'not_started' | 'started' | 'completed' | 'skipped';
  currentStep?: number;
}) {
  const currentUser = await requireCurrentUserContext();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_onboarding_tours')
    .upsert({
      user_id: currentUser.userId,
      tour_key: input.tourKey,
      tour_version: input.tourVersion,
      status: input.status,
      current_step: input.currentStep ?? null,
      ...(input.status === 'started' && { started_at: new Date().toISOString() }),
      ...(input.status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(input.status === 'skipped' && { skipped_at: new Date().toISOString() }),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, tour_key' });

  if (error) throw new Error(`Failed to upsert tour state: ${error.message}`);
}

export async function getOnboardingTourState(tourKey: string) {
  const currentUser = await requireCurrentUserContext();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_onboarding_tours')
    .select('*')
    .eq('user_id', currentUser.userId)
    .eq('tour_key', tourKey)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch tour state: ${error.message}`);
  return data;
}
```

**Key guarantees:**
1. `requireCurrentUserContext()` throws if no authenticated session — the server action itself fails before any DB operation.
2. `currentUser.userId` is always set (the function enforces this).
3. DB queries always filter by `currentUser.userId`, so even if RLS were misconfigured, the application layer provides a second defense.
4. No `user_id` is ever accepted from client input (the server action derives it).

### Auth gate placement

The `proxy.ts` middleware already protects all `/workshop` routes:

```typescript
// src/proxy.ts (line 8)
const PROTECTED_PREFIXES = ["/workshop"];
```

Since `WorkshopPageShell` is only used in `/workshop` routes and those routes require authentication, onboarding server actions are indirectly gated by the middleware. However, server actions should NOT rely on middleware alone — `requireCurrentUserContext()` is the authoritative check.

---

## Workspace Leakage Concerns

**Design decision:** Tour state is purely user-level. No `workspace_id` column exists in the schema.

| Concern | Mitigation |
|---------|-----------|
| User in workspace A sees tours from workspace B | Impossible — tour state has no workspace dimension. Tours are shown based on `user_id` alone. |
| Tour content references workspace-specific data | Tour step definitions are static JSON (e.g., `title: "Your first project"`), never parameterized with workspace data. |
| Cross-workspace information leakage | No channel exists for this — tour state is a flat key-value per user. |

**Why user-level (not workspace-level):** Onboarding tours teach the *product*, not a specific workspace. A user who joins a second workspace already knows how to use Archestimator. Additionally, user-level scoping means a user who dismisses "First Workspace Orientation" in one workspace won't be pestered with it in another.

---

## Cross-User Access Prevention

### RLS Policy Design

```sql
-- Enable RLS
ALTER TABLE user_onboarding_tours ENABLE ROW LEVEL SECURITY;

-- SELECT: User can only see their own tour state
CREATE POLICY "Users can view their own tour state"
  ON user_onboarding_tours
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: User can only insert for themselves
CREATE POLICY "Users can insert their own tour state"
  ON user_onboarding_tours
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: User can only update their own tour state
CREATE POLICY "Users can update their own tour state"
  ON user_onboarding_tours
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: Users cannot delete their tour history
-- (Only service_role can delete, e.g., for GDPR data deletion requests)
```

### Defense in depth

| Layer | Mechanism | What it prevents |
|-------|-----------|-----------------|
| Database | RLS policies (above) | Any query that doesn't match `auth.uid() = user_id` returns zero rows |
| Server action | `requireCurrentUserContext()` | Unauthenticated requests are rejected before DB call |
| Server action | `currentUser.userId` filter in every query | Even if RLS is misconfigured, application-level WHERE clause prevents cross-user access |
| Client | Zustand store scoped to current session | Client state is derived from server response, never from user-controlled input |
| Network | Supabase PostgREST with anon key | Anonymous requests cannot bypass RLS; service_role access is server-side only |

**Note:** There is intentionally NO `FOR DELETE` policy. Users should not be able to delete their tour history (it's non-sensitive and useful for support/debugging). A future GDPR data-deletion flow would use `service_role` to delete all user data including tour state.

---

## Server Action Authorization

Following the **exact existing pattern** from the codebase (verified in 6 server action files on 2026-06-03):

```typescript
'use server';

import { requireCurrentUserContext } from '@/lib/auth/session';

export async function upsertOnboardingTourState(input: UpsertInput) {
  const currentUser = await requireCurrentUserContext();
  // All DB operations use currentUser.userId — never accept user_id from client
}
```

### Authorization checklist for every onboarding server action:

- [x] Import `requireCurrentUserContext` from `@/lib/auth/session`
- [x] Call `requireCurrentUserContext()` as the first step (before any DB operation)
- [x] Never destructure `user_id` from client input
- [x] Always filter DB queries by `currentUser.userId`
- [x] Never return other users' data (filtered at query level + RLS)

---

## Privacy Impact

### Classification: **Low privacy impact**

| Dimension | Assessment |
|-----------|-----------|
| What data is collected | Tour key (static string), step index (integer), status (enum), timestamps |
| Is any of it PII? | No. `user_id` is a UUID, not personally identifiable without access to `auth.users`. |
| Is it behavioral tracking? | No. Tour state records feature adoption (did user see onboarding?), not ongoing behavior (what did user click afterward?). |
| Is it shared with third parties? | No. Data stays within the existing Supabase instance. |
| Is it used for advertising? | No. Archestimator has no advertising or third-party tracking. |
| Is it used for decision-making? | No. Tour completion status does not gate any feature access. Status is advisory (e.g., "Don't show this tour again"). |
| Is it sensitive? | No. Knowing that a user completed "First Workspace Orientation" reveals nothing sensitive. |

### Comparison to existing data

Archestimator already stores far more sensitive data:
- Estimate data (financial figures, project costs)
- Project metadata (client names, project names)
- Collaboration invitations (email addresses)
- Shared link comments and decisions

Tour state is the **least sensitive** data in the system by a wide margin.

---

## Abuse Cases

| Attack | Risk | Mitigation |
|--------|------|-----------|
| **Rapid tour state writes** (DoS via flooding `upsertOnboardingTourState` with 1000 req/s) | LOW | (a) TanStack Query mutation deduplication (React batches state updates). (b) Debounce writes to 500ms minimum interval at the Zustand layer. (c) Archestimator already has rate-limiting patterns from the share/comment system (can be extended). (d) Supabase RLS makes each write lightweight (single-row upsert). |
| **Tour state enumeration** (attacker tries `tour_key=user_123_tour` to read other users' data) | VERY LOW | RLS `USING (auth.uid() = user_id)` prevents this at the DB level. Server action only queries `WHERE user_id = currentUser.userId`. Even if an attacker bypasses the server action and calls PostgREST directly, RLS blocks the query. |
| **Fake tour completion** (user sends `status='completed'` via API without actually viewing the tour) | BENIGN | This is self-defeating — the user only harms their own onboarding experience. Tour status is client-advisory, not security-critical. No feature gate depends on tour completion. The worst case: user skips onboarding and later can't find a feature. |
| **SQL injection via `tour_key`** | VERY LOW | All DB queries use parameterized Supabase client (`eq('tour_key', input.tourKey)`), not raw SQL. The `tour_key` is validated against a known set of tour definitions server-side. |
| **JSONB injection via `metadata`** | VERY LOW | `metadata` is never queried with JSON path expressions from user input. It's inert key-value storage. |

### Client-side tampering note

- The Zustand store holds runtime tour state (current step, visibility).
- A user could theoretically modify this in DevTools.
- **This is not a security concern** — the Zustand store is derived from server state, and any client-side manipulation only affects the user's own tour display.
- The server action is always the source of truth for `status` (completed/skipped).
- Client can set `status='completed'` locally, but the next page load fetches server state and corrects it.

---

## Logging / Analytics Event Privacy

**Future analytics events (MVP has none; no-op in Phase 1-6):**

| Event name | Properties | PII? |
|-----------|-----------|------|
| `onboarding_started` | `tour_key`, `tour_version` | No |
| `onboarding_step_viewed` | `tour_key`, `step_index` | No |
| `onboarding_completed` | `tour_key`, `tour_version`, `duration_ms` | No |
| `onboarding_skipped` | `tour_key`, `tour_version`, `step_at_skip` | No |

**Privacy rules for future analytics:**
- No `user_id` in analytics events (use anonymous session ID if available)
- No `workspace_id` (to prevent cross-workspace tracking)
- No page URL (to prevent accidentally logging project IDs or estimate IDs in URL paths)
- Analytics are no-op in MVP; must pass a separate privacy review before activation
- Analytics implementation would use Archestimator's existing consent mechanism pattern (`src/lib/landing/` consent gate)

---

## Public Route Exclusion

Onboarding code MUST never be loaded on public (unauthenticated) routes.

### Verified route isolation (2026-06-03 codebase audit)

| Route | Component tree | Loads WorkshopPageShell? | Loads onboarding? |
|-------|---------------|------------------------|-------------------|
| `/` | Landing page components (`src/components/landing/*`), `src/app/page.tsx` | **NO** | **NO** |
| `/about/` | Static page | **NO** | **NO** |
| `/features/` | Static page | **NO** | **NO** |
| `/pricing/` | Static page | **NO** | **NO** |
| `/contact/` | Static page + form | **NO** | **NO** |
| `/login/` | Auth page (`src/app/login/`) | **NO** | **NO** |
| `/privacy/` | Legal placeholder | **NO** | **NO** |
| `/terms/` | Legal placeholder | **NO** | **NO** |
| `/auth/callback/` | OAuth handler (API route) | **NO** | **NO** |
| `/invite/[token]/` | Invite entry page (own layout) | **NO** | **NO** |
| `/workshop/*` | `WorkshopPageShell` → wraps all workshop routes | **YES** | **Feature-gated** |

**Middleware protection:** `src/proxy.ts` protects all `/workshop` routes:
```typescript
const PROTECTED_PREFIXES = ["/workshop"];
```

**Bundle guarantee:** React Joyride is:
1. Only imported in `WorkshopPageShell.tsx` (via `next/dynamic` with `ssr: false`)
2. Only rendered when `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`
3. Tree-shaken from all non-workshop bundles by Next.js (verified via `ANALYZE=true bun run build`)

---

## Shared Link Route Exclusion

Shared links (`/share/[token]/`) are public, unauthenticated routes. They must never load onboarding code.

| Aspect | Verification |
|--------|-------------|
| Component tree | Share routes use their own components in `src/components/share/` (11 files verified). Never import `WorkshopPageShell`. |
| CSP headers | `next.config.ts` enforces `Content-Security-Policy` (not just Report-Only) on `/share/:path*` routes (line 77-88). Any unexpected script would be blocked. |
| Bundle isolation | Share page bundles do not include any workshop code. Next.js code splitting by route ensures this. |

---

## Supabase RLS Policy Checklist

- [ ] `user_onboarding_tours` table: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [ ] SELECT policy: `USING (auth.uid() = user_id)`
- [ ] INSERT policy: `WITH CHECK (auth.uid() = user_id)`
- [ ] UPDATE policy: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- [ ] No DELETE policy (reserved for `service_role` only)
- [ ] Policies tested with Vitest (Supabase local) — pattern from existing tests in `tests/vitest/`
- [ ] Policies verified on linked Supabase (staging) — `supabase --project-ref <ref> db push`
- [ ] Unique constraint on `(user_id, tour_key)` prevents duplicate state rows

### Testing approach (matching existing test patterns)

Tests should follow the pattern established in `tests/vitest/project-collaboration-realtime.test.ts` which already verifies `requireCurrentUserContext` usage:

```typescript
// tests/vitest/onboarding/rls.test.ts
describe('user_onboarding_tours RLS', () => {
  it('prevents cross-user SELECT');
  it('prevents cross-user INSERT');
  it('prevents cross-user UPDATE');
  it('prevents DELETE for authenticated users');
});
```

---

## Summary

| Dimension | Rating | Key Mitigation |
|-----------|--------|---------------|
| Data sensitivity | LOW | No PII, no business data, no financial data |
| Cross-user access | VERY LOW RISK | RLS + `requireCurrentUserContext()` + application-level WHERE clause |
| Cross-workspace leakage | IMPOSSIBLE | No workspace dimension in schema |
| Public route leakage | PREVENTED | Route isolation + dynamic import + feature flag + CSP headers |
| Client-side tampering | BENIGN | Tour state is advisory, not security-critical |
| Abuse / DoS | LOW | Debounce + RLS lightweight + existing rate limit patterns |
| Privacy impact | LOW | No tracking, no third-party sharing, no PII |
