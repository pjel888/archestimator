# 03 — RPC & Lean-Fetch Design

> Directional design, **not** ready-to-run DDL. SQL sketches communicate intent; the implementer writes, `EXPLAIN`s, and proves the real thing against a Supabase branch DB.

## A. Phase-1 app-only wave-merge (no DB object)

Target: `getWorkshopHomebaseData` in `src/lib/repositories/workspace-repository.ts`.

Directional shape (TypeScript pseudo, not final):

```
// After the H1 parallel wave resolves and ids are known:

// (1) one latency wave instead of serial H3 + H4.
// Preferred: two bounded arms in Promise.all, not one optimistic OR query.
const recentEstimateProjectIds = unique([
  ...recentProjects.map((project) => project.id),
  ...favoriteProjectIds,
]);
const [recentEstimateRows, favoriteEstimateRows] = await Promise.all([
  recentEstimateProjectIds.length
    ? db.from("estimates")
        .select("id, project_id, name, sheet_code, updated_at")
        .in("project_id", recentEstimateProjectIds)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(recentLimit)
    : EMPTY,
  favoriteEstimateIds.length
    ? db.from("estimates")
        .select("id, project_id, name, sheet_code, updated_at")
        .in("id", favoriteEstimateIds.slice(0, MAX_FAVORITE_ESTIMATE_IDS))
    : EMPTY,
]);
const estimates = dedupeById([...recentEstimateRows, ...favoriteEstimateRows]);
// then re-split recent vs favorite in TS

// (2) one projects backfill instead of H2 + H5 (merge favorite + missing id sets)
const backfillIds = unique([...favoriteProjectIds, ...missingProjectIds]);
const backfillProjects = backfillIds.length
  ? await db.from("projects").select(PROJECT_COLS).in("id", backfillIds)
  : [];

// (3) independent tail as ONE wave (was three serial awaits)
// CRITICAL: H7 (pending-invite summary) takes the ROLE-FILTERED subset, not all ids —
// preserve the existing filter or sentPendingInviteCount changes (see 09-… parity cases).
const manageableProjectIds = projects
  .filter((p) => canManageCollaborationRole(resolveProjectAccess(p).currentUserRole))
  .map((p) => p.id);
const [publications, pendingInvites, estimateNodes] = await Promise.all([
  readOptionalProjectPublications(db, projectIds),                                   // ALL project ids
  readPendingCollaborationVisibilitySummary({ email, projectIds: manageableProjectIds, supabase: db }), // subset
  estimateIds.length
    ? db.from("estimate_nodes").select("id, estimate_id, kind, parent_id, sort_order").in("estimate_id", estimateIds)
    : EMPTY,
]);
```

Properties preserved: workspace/user RLS filters unchanged; favorite estimates outside the recent window remain present when visible; the H7 role-filter (`canManageCollaborationRole`) preserved; each optional read still has its own try/tolerate path; ordering/dedup re-applied in TS exactly as today. No migration, no `types.ts` change. The full binding contract is `09-phase-1-query-shape-and-dataflow-contract.md`.

## B. Phase-2 dashboard-lean library fetch (no DB object)

New export in `src/lib/repositories/component-library-repository.ts`, consumed by `loadDashboardLibrarySpotlight` in `src/app/workshop/page.tsx`. Returns the existing `DashboardLibrarySpotlight` type (`src/components/workshop/dashboard/lib.ts`) — no type change.

```
export async function getLibraryDashboardSpotlight(): Promise<DashboardLibrarySpotlight | null> {
  // ONE wave, 2-3 requests (vs getLibraryOverview's 11):
  //   - cost_library_items recent 5 with exact active count → componentCount + recentComponents
  //   - estimate_templates count only                       → templateCount
  // Return recentTemplates: [] unless the dashboard starts rendering template detail.
  // No template node/row-count query in v1; the current dashboard does not render it.
  // try/catch → null, identical best-effort contract as today
}
```

`getLibraryOverview()` stays exactly as-is for the Library page. The two diverge intentionally; a shared column-set constant keeps the recent-component projection aligned.

## C. Phase-3 candidate `workspace_homebase_summary` RPC (GATED)

This **is** A-23 / Phase-8 of the Performance-Refactor pack. Coordinate the column set with that pack's DTO law (`10_PHASE_4_DATA_AND_CACHE_PLAN.md`) — do not invent a parallel contract.

Directional signature:

```sql
-- DIRECTIONAL — not ready-to-run. Implementer proves with EXPLAIN + cross-tenant denial.
create or replace function public.workspace_homebase_summary(
  target_workspace_id uuid,
  recent_limit int default 12
)
returns jsonb
language sql
security invoker          -- NOT definer; rely on RLS + membership join (RISK-20)
set search_path = public
stable
as $$
  -- Clamp recent_limit inside the SQL body, e.g.
  -- safe_recent_limit = least(greatest(coalesce(recent_limit, 12), 1), 50)
  -- one statement returning { recentProjects, favoriteProjects, recentEstimates,
  --   favoriteEstimates, estimateNodeRoots } as jsonb, each sub-select membership-joined
  -- and workspace-scoped, mirroring the per-table LIMIT/ORDER semantics of today's reads.
$$;
```

**Non-negotiable design constraints (RISK-20):**
- `security invoker` (so the caller's RLS applies) **+** every sub-select joins through `workspace_members` / `project_members` so a guessed `workspace_id` returns nothing. **Do NOT rely on child-table RLS alone** (e.g. `WHERE estimate_id = ANY(...)` + caller RLS) — that is the exact gap doc 22 §2.2 of the Performance-Refactor pack forbids.
- User-personalized sub-selects filter on `(select auth.uid())`; User A must never see User B's favorites.
- `recent_limit` is clamped to a bounded range before use.
- `revoke execute on function public.workspace_homebase_summary(...) from public, anon;` — execute granted only to the authenticated role. (Mandatory; easy to forget.)
- `set search_path = public` to prevent search-path hijack.
- Returns `jsonb` so the additive `types.ts` splice is a single hand-typed return (see `06-…`), not a generated-row explosion.
- Keeps publications + pending-invite summary **out** of the RPC (they stay best-effort app reads in the OPP-1 `Promise.all` wave) so one missing optional table can't fail the whole payload.

**Why `security invoker` not `definer`:** a `definer` aggregate that forgets a membership join leaks cross-tenant on a guessed UUID — the worst outcome. `invoker` + membership-joined `WHERE` is the *intended* posture (Performance-Refactor RISK-20), but note it is **not yet an established, proven pattern in the repo**: the existing `get_project_chart_buckets` RPC referenced by that pack is documented (Phase-8 doc) as currently missing the membership join and the `revoke`, and is expected to FAIL cross-tenant denial today. **Do not copy that file's WHERE clause.** Use the working `prove:estimate-list-summaries` gate as the precedent and author a fresh cross-tenant denial test (see `05-…`/`06-…`).

## D. Caching posture — option considered and REJECTED

`src/app/workshop/page.tsx` sets no `revalidate`/`dynamic` (fully dynamic, per-request fresh). An ISR `export const revalidate = 30` was considered (counts change slowly) but is **rejected**:

- The dashboard renders **recent projects and estimates** — a multi-user workspace where a teammate's edit must show promptly. Page-level ISR would serve a stale snapshot of *all* dashboard data, not just counts.
- The safe, real win is **fewer/cheaper queries** (OPP-1/2), not caching stale tenant data.

**Permitted caching only:** request-scoped `React.cache` wrapping (dedupe within a single render) on the new lean fetch — no cross-request staleness. Any cross-request cache is deferred to the Performance-Refactor pack's gated `cacheComponents` lane (its RISK-23), not this pack.
