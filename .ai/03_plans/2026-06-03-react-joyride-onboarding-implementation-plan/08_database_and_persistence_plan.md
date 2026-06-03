# 08 Database and Persistence Plan

**Status:** Planning-only
**Supersedes:** None — first-framing document for onboarding tour persistence
**References:**
- `src/lib/supabase/types.ts` (generated types, 3263 lines, ~90 table types)
- `src/lib/auth/session.ts` (`requireCurrentUserContext`, `getCurrentUserContext`)
- `src/lib/estimates/actions.ts` (server-actions pattern with `"use server"` + `requireCurrentUserContext()`)
- `src/app/providers.tsx` (`AppProviders` — TanStack Query with 5-min `staleTime`/`gcTime`)
- `supabase/migrations/20260527072220_auth_account_data.sql` (RLS pattern, triggers, grants)

---

## Decision: Supabase `user_onboarding_tours` Table

### Why Supabase/PostgreSQL — Not localStorage

ArchEstimator is an authenticated SaaS with users who work across devices. localStorage fails on every SaaS reliability axis:

| Concern | localStorage | Supabase + RLS |
|---------|-------------|----------------|
| Cross-device sync | ❌ None | ✅ Natural (same user across devices) |
| Browser data clear | ❌ Total loss | ✅ Persisted |
| Private/incognito | ❌ Not available | ✅ Available (authenticated) |
| Multi-device consistency | ❌ Impossible | ✅ Single source of truth |
| User identity verification | ❌ Cannot verify | ✅ Server-authoritative (`auth.uid()`) |
| Data ownership (SaaS expectation) | ❌ Violates | ✅ Standard practice |
| Access control | ❌ Client-mutable | ✅ Database-enforced (RLS) |
| Audit trail | ❌ None | ✅ Timestamps, metadata, versioning |

**localStorage remains acceptable only as a transient supplement:**
- Caching tour state between page loads (supplemental, not authoritative)
- Temporary step progress during active tour (recovery from browser crash)
- Dev-only fallback when Supabase is unreachable
- **NEVER** use localStorage as the source of truth

---

## Recommended Table Schema

```sql
CREATE TABLE public.user_onboarding_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key text NOT NULL,
  tour_version integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('not_started', 'started', 'completed', 'skipped')),
  current_step integer,
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_key, tour_version)
);
```

### Column Rationale

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `uuid PK` | Internal primary key. Uses `gen_random_uuid()` matching the existing 48-migration pattern. |
| `user_id` | `uuid FK → auth.users(id)` | Owner. `ON DELETE CASCADE` — clean up tour state when a user is deleted (GDPR-aligned, no orphaned rows). |
| `tour_key` | `text` | Stable tour identifier, e.g. `workspace.orientation`, `project.create`, `estimate.sheet`. Must survive route renames. |
| `tour_version` | `integer DEFAULT 1` | When a tour's step sequence changes meaningfully, increment the version. Old completions are preserved; an in-progress tour at a stale version can be force-completed before starting the new version. |
| `status` | `text CHECK (...)` | Enum-like constraint. Four states: `not_started` (default, only inserted on first upsert), `started` (user is mid-tour), `completed` (user finished or auto-completed), `skipped` (user explicitly dismissed). |
| `current_step` | `integer nullable` | Zero-indexed step number during active tours. `NULL` when `not_started`/`completed`/`skipped`. |
| `started_at` | `timestamptz` | When the tour first began. Set once on transition from `not_started` → `started`. |
| `completed_at` | `timestamptz` | When the user completed the tour. Set on transition to `completed`. |
| `skipped_at` | `timestamptz` | When the user dismissed without completing. Set on transition to `skipped`. |
| `last_seen_at` | `timestamptz` | Last time the user interacted with this tour (any step). Useful for "resume later" sessions and analytics. |
| `metadata` | `jsonb DEFAULT '{}'` | Extensible payload for future needs: A/B test variant, locale, step-specific completion data. Must remain PII-free — no user emails, names, IPs, or session tokens. |
| `created_at` / `updated_at` | `timestamptz` | Auto-managed. `created_at` via `DEFAULT now()`. `updated_at` via trigger (see below). |

### UNIQUE Constraint

```sql
UNIQUE(user_id, tour_key, tour_version)
```

This means one row per user + tour + version. The server action uses `INSERT ... ON CONFLICT (user_id, tour_key, tour_version) DO UPDATE` (upsert pattern) so the same tour key always resolves to a single row per version.

**Why `tour_version` is in the unique:** When a tour is redesigned (new steps, reordered targets), incrementing `tour_version` creates a new row entry. The old row at version N is preserved as historical data. This avoids forced resets and allows future analytics like "what percentage of users completed version 1 vs version 2?"

### Decision: `workspace_id` NOT Included

- Current planned tours are user-level (workspace orientation, first estimate, component library).
- All authenticated users share the same onboarding experience regardless of workspace.
- No workspace-specific tours are planned yet.
- If workspace-scoped tours are needed later, add `workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE` via migration with a `NULL` default and adjust the UNIQUE constraint. The existing rows (with `workspace_id = NULL`) remain valid.

---

## Indexes

```sql
-- Primary lookup: fetch all tours for a user
CREATE INDEX user_onboarding_tours_user_idx
  ON public.user_onboarding_tours(user_id, last_seen_at DESC);

-- Deduplication and upsert target lookup
CREATE INDEX user_onboarding_tours_key_version_idx
  ON public.user_onboarding_tours(user_id, tour_key, tour_version);

-- Status filtering (e.g., "show me all completed tours")
CREATE INDEX user_onboarding_tours_status_idx
  ON public.user_onboarding_tours(user_id, status);
```

---

## RLS Policies

Following the existing pattern in `supabase/migrations/20260527072220_auth_account_data.sql` (lines 136-161):

```sql
-- Enable RLS (required — matches all 48+ existing migrations)
ALTER TABLE public.user_onboarding_tours ENABLE ROW LEVEL SECURITY;

-- Users can read their own tour state
CREATE POLICY "Users can view own onboarding tours"
  ON public.user_onboarding_tours
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own tours
CREATE POLICY "Users can insert own onboarding tours"
  ON public.user_onboarding_tours
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tours
CREATE POLICY "Users can update own onboarding tours"
  ON public.user_onboarding_tours
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: users should not delete tour history.
-- Service role bypass via `supabaseAdmin` client for admin operations if needed.
```

**Why no SELECT policy for anon?** Onboarding tours are only relevant to authenticated users inside `/workshop`. Public routes never query this table. If a future public onboarding flow (e.g., pre-signup product tour) is needed, add a separate anon-readable table — do not relax this policy.

**Why no DELETE policy?** Users cannot delete their tour history. This prevents accidental data loss and ensures audit integrity. If a "reset all tours" feature is needed later, implement it as a server action that sets `status = 'not_started'` with `current_step = NULL` — a soft reset, not a hard delete.

---

## Triggers

Following the existing `set_updated_at()` trigger pattern (see migration `20260527072220`, line 122-125):

```sql
-- Auto-update updated_at on row modification
CREATE TRIGGER user_onboarding_tours_set_updated_at
  BEFORE UPDATE ON public.user_onboarding_tours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

`set_updated_at()` is a shared Supabase utility function (`NEW.updated_at = now()`) already used across 48+ migrations. No need to redefine it.

---

## Grants

```sql
GRANT SELECT, INSERT, UPDATE ON public.user_onboarding_tours TO authenticated;
```

Following the existing pattern (line 157-158 of `20260527072220`). Note the existing `user_onboarding_profiles` table uses `REVOKE INSERT, UPDATE, DELETE` (line 160) — that table is write-once during signup. Our table supports ongoing updates (resume, progress, skip), so INSERT + UPDATE are granted.

If a service-role operation is needed later (e.g., admin resets a user's tour), use `createSupabaseServerClient()` with `service_role` key and bypass RLS — add a comment documenting this.

---

## Server Actions (`src/lib/onboarding/actions.ts`)

Following the exact pattern from `src/lib/estimates/actions.ts` (lines 1-8, 1285+):

```typescript
"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/supabase/types";

type UserOnboardingTour = Tables<"user_onboarding_tours">;
type UserOnboardingTourInsert = TablesInsert<"user_onboarding_tours">;

/**
 * Fetch all tour states for the current authenticated user.
 * Called on workspace mount to determine which tours to show.
 */
export async function getUserOnboardingTours(): Promise<UserOnboardingTour[]> {
  const currentUser = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_onboarding_tours")
    .select("*")
    .eq("user_id", currentUser.userId)
    .order("last_seen_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch onboarding tours: ${error.message}`);
  return data ?? [];
}

/**
 * Upsert tour state — used for start, step progress, complete, and skip.
 * Uses ON CONFLICT DO UPDATE to ensure exactly one row per (user_id, tour_key, tour_version).
 */
export async function upsertOnboardingTourState(input: {
  tourKey: string;
  tourVersion: number;
  status: "started" | "completed" | "skipped" | "not_started";
  currentStep?: number;
  metadata?: Record<string, unknown>;
}): Promise<UserOnboardingTour> {
  const currentUser = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();

  const now = new Date().toISOString();
  const insert: UserOnboardingTourInsert = {
    user_id: currentUser.userId,
    tour_key: input.tourKey,
    tour_version: input.tourVersion,
    status: input.status,
    current_step: input.currentStep ?? null,
    started_at: input.status === "started" ? now : undefined,
    completed_at: input.status === "completed" ? now : undefined,
    skipped_at: input.status === "skipped" ? now : undefined,
    last_seen_at: now,
    metadata: (input.metadata ?? {}) as Record<string, unknown>,
  };

  const { data, error } = await supabase
    .from("user_onboarding_tours")
    .upsert(insert, {
      onConflict: "user_id, tour_key, tour_version",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert onboarding tour: ${error.message}`);
  return data;
}

/**
 * Fetch a single tour's state. Returns null if never interacted with.
 */
export async function getOnboardingTourState(
  tourKey: string,
  tourVersion: number,
): Promise<UserOnboardingTour | null> {
  const currentUser = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_onboarding_tours")
    .select("*")
    .eq("user_id", currentUser.userId)
    .eq("tour_key", tourKey)
    .eq("tour_version", tourVersion)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch tour state: ${error.message}`);
  return data;
}
```

### Server Action Invocation Pattern (Client-Side)

Server actions are imported and called directly from client components:

```typescript
// In OnboardingProvider.tsx ("use client")
import { getUserOnboardingTours, upsertOnboardingTourState } from "@/lib/onboarding/actions";

// Wrap in useCallback or call directly
const tours = await getUserOnboardingTours();
await upsertOnboardingTourState({
  tourKey: "workspace.orientation",
  tourVersion: 1,
  status: "completed",
});
```

No API route needed. Server actions are the approved write pattern. This matches how `src/lib/estimates/actions.ts`, `src/lib/projects/actions.ts`, and `src/lib/component-library/actions.ts` all work.

---

## Client-Side Strategy

### State Architecture

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Server authority** | Supabase + RLS | Source of truth for tour completion status |
| **Server cache** | TanStack Query | 5-min `staleTime`/`gcTime` (matches existing `AppProviders` config in `src/app/providers.tsx`), dedupes requests, background refetch |
| **Runtime state** | Zustand (or React context) | Active tour step, isRunning, isPaused. Ephemeral — not persisted. |
| **Transient cache** | localStorage | Optional: cache last known state for instant mount (validated against server on next fetch). Never authoritative. |

### On Mount Flow

```
1. WorkshopPageShell renders
2. <Suspense> resolves (children become visible)
3. OnboardingRuntime mounts (client-only, lazy-loaded)
4. getUserOnboardingTours() server action fires
5. Response determines which tours to start
6. If tour_key X is not_started → start tour
7. If tour_key X is started with current_step > 0 → resume from that step
8. If tour_key X is completed/skipped → skip this tour
```

### Optimistic Updates

- **Zustand state updates immediately** when user clicks Next/Previous/Skip/Complete
- **Server action fires in background** (fire-and-forget for non-critical steps)
- **On completion/skip**: await the server action to ensure state is persisted before allowing navigation away
- **On error**: revert Zustand state and show toast ("Failed to save tour progress. Please try again.") — using the existing `ToastProvider` in `AppProviders` (`src/app/providers.tsx`, line 34)

### TanStack Query Integration

```typescript
// Query key pattern (following existing conventions)
const tourQueryKey = ["onboarding-tours"] as const;

// Query
const { data: tours = [] } = useQuery({
  queryKey: tourQueryKey,
  queryFn: getUserOnboardingTours,
  staleTime: 5 * 60_000,   // 5 min — matches AppProviders default
  gcTime: 5 * 60_000,       // 5 min — matches AppProviders default
});

// Mutation (optimistic)
const upsertMutation = useMutation({
  mutationFn: upsertOnboardingTourState,
  onMutate: async (input) => {
    // Cancel queries, snapshot previous state
    await queryClient.cancelQueries({ queryKey: tourQueryKey });
    const previous = queryClient.getQueryData(tourQueryKey);
    // Optimistically update
    queryClient.setQueryData(tourQueryKey, (old: UserOnboardingTour[]) =>
      old.map((t) => (t.tour_key === input.tourKey ? { ...t, ...input } : t)),
    );
    return { previous };
  },
  onError: (_err, _input, context) => {
    // Rollback
    queryClient.setQueryData(tourQueryKey, context?.previous);
    // Toast error
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: tourQueryKey });
  },
});
```

Following the existing optimistic mutation pattern from `use-estimate-row-mutations.ts` and `use-estimate-query.ts`.

---

## Supabase Type Generation

After applying the migration:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

This auto-generates `Tables<"user_onboarding_tours">`, `TablesInsert<"user_onboarding_tours">`, and `TablesUpdate<"user_onboarding_tours">` types in the existing types file at `src/lib/supabase/types.ts` (3263 lines, generated). No manual type definitions needed.

---

## Migration Naming and Application

### Migration File

```bash
npx supabase migration new user_onboarding_tours
```

This creates: `supabase/migrations/XXXXXXXXXXXXXX_user_onboarding_tours.sql`

The timestamp prefix (14 digits) is auto-generated by the Supabase CLI. The migration SQL should include:
1. The `CREATE TABLE` statement (above)
2. Indexes
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. RLS policies
5. Trigger for `updated_at`
6. `GRANT` statements

### Apply Locally

```bash
npx supabase migration up
npx supabase db reset   # if seed data needs to be regenerated
```

---

## Relationship to Existing `user_onboarding_profiles`

The existing `public.user_onboarding_profiles` table (migration `20260527072220`, line 1-31) is for **signup profile completion** — collecting display name, user category, country, and primary use during initial account setup. It is a write-once table (`REVOKE INSERT, UPDATE, DELETE` on line 160).

Our `user_onboarding_tours` table is for **product tour completion tracking** — a completely separate concern. The naming similarity is intentional (both are "onboarding") but the schemas are unrelated. They share the same `user_id` reference to `auth.users(id)` but otherwise have zero overlap.

No foreign key or join between the two tables is needed. If future analytics combine profile data (user category, country) with tour completion rates, do so at the application layer, not the schema layer.

---

## Security Implications

| Concern | Mitigation |
|---------|-----------|
| User A reads User B's tour state | RLS policy `USING (auth.uid() = user_id)` — impossible at DB level |
| User A modifies User B's tour state | RLS policy `WITH CHECK (auth.uid() = user_id)` — impossible at DB level |
| Client-side state manipulation | Server actions verify `auth.uid()` via `requireCurrentUserContext()` before any write. Client can't bypass RLS. |
| Deleted user's tour data lingers | `ON DELETE CASCADE` on `user_id` — cleaned up automatically |
| PII leak via `metadata` jsonb | Metadata is audited for PII before any fields are added. Current metadata usage: none. Future fields must pass PII review. |
| SQL injection | Parameterized queries via Supabase client — no raw SQL in server actions |
| Timing attack on tour status | Not applicable — tour state is low-sensitivity. All authenticated users with matching `auth.uid()` can read/write their own rows. |

---

## Rollback Strategy

### Per-Phase

| Phase | If Something Breaks | Rollback Action |
|-------|---------------------|-----------------|
| Phase 4 (migration) | Migration fails to apply | `supabase migration repair --status reverted <version>` — migration is pure DDL, no data migration |
| Phase 4 (server actions) | Server action throws | Application-level: revert to previous `src/lib/onboarding/actions.ts`. No data to clean up. |
| Phase 4 (RLS) | RLS blocks legitimate access | Disable RLS temporarily (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`), fix policy, re-enable |
| Any phase | Full rollback needed | `DROP TABLE IF EXISTS public.user_onboarding_tours CASCADE;` — clean removal. No other tables reference it. |

### Migration Reversibility

The `CREATE TABLE` is fully reversible. Since no other tables reference `user_onboarding_tours` (no FK from outside), dropping the table requires no cascading cleanup beyond the table itself and its indexes.

---

## Future Extensions

### workspace_id (Multi-Workspace Tours)

If workspace-specific tours are needed later:

```sql
-- Migration: add workspace_id
ALTER TABLE public.user_onboarding_tours
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Drop old UNIQUE constraint
ALTER TABLE public.user_onboarding_tours
  DROP CONSTRAINT user_onboarding_tours_user_id_tour_key_tour_version_key;

-- Add new UNIQUE including workspace_id (NULL-safe)
ALTER TABLE public.user_onboarding_tours
  ADD CONSTRAINT user_onboarding_tours_user_id_workspace_id_tour_key_tour_version_key
  UNIQUE NULLS NOT DISTINCT (user_id, workspace_id, tour_key, tour_version);

-- Existing rows with workspace_id = null remain valid
```

### Analytics Columns

If analytics integration is needed later:

```sql
ALTER TABLE public.user_onboarding_tours
  ADD COLUMN ab_test_variant text;          -- A/B test variant identifier
ALTER TABLE public.user_onboarding_tours
  ADD COLUMN steps_completed integer[];     -- Which steps were completed (for partial completion analytics)
ALTER TABLE public.user_onboarding_tours
  ADD COLUMN time_spent_seconds integer;    -- Total time in tour
```

All nullable — no migration risk to existing rows.

---

## Quality Scorecard Self-Check

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Table schema complete | ✅ Pass | Full CREATE TABLE with CHECK constraints, defaults, UNIQUE |
| RLS policies defined | ✅ Pass | SELECT, INSERT, UPDATE policies with `auth.uid()` |
| Server actions match existing pattern | ✅ Pass | `"use server"` + `requireCurrentUserContext()` pattern from `src/lib/estimates/actions.ts` |
| Client strategy defined | ✅ Pass | TanStack Query + Zustand + localStorage fallback — all three layers explicitly bounded |
| Migration naming | ✅ Pass | `supabase migration new user_onboarding_tours` — follows Supabase CLI convention |
| Type generation | ✅ Pass | `supabase gen types typescript --linked > src/lib/supabase/types.ts` — existing pipeline |
| Rollback documented | ✅ Pass | Per-phase rollback actions + full DROP TABLE option |
| Security review | ✅ Pass | RLS, ON DELETE CASCADE, PII-free metadata, parameterized queries |
| No workspace_id (decision + rationale) | ✅ Pass | Documented with future extension path |
| localStorage limitations | ✅ Pass | Five explicit failure modes documented |
