# 09 — Phase 1 Query Shape & Dataflow Contract

> This is the implementation contract for the app-only homebase optimization. It exists because the biggest correctness risk is not "can batching help"; it is "can batching preserve the existing limits, ordering, favorites, and RLS behavior?"

## Current Dependency Shape

`getWorkshopHomebaseData` starts with an H1 parallel wave that already provides:

- recent project rows visible to the caller;
- favorite project ids;
- favorite estimate ids;
- membership maps needed for role-aware visibility;
- workspace membership context.

The old flow then performs dependent reads for favorite project rows, recent estimates, favorite estimates, missing project backfill, optional publications, pending-invite summary, and estimate nodes.

Phase 1 removes latency waves without changing the DTO.

## Required Dataflow

The Phase 1 flow must be this exact shape unless measurement proves a safer equivalent:

1. **H1 baseline wave remains.** Do not move auth/workspace/user checks later.
2. Build `recentEstimateProjectIds = unique(recentProjectIds + favoriteProjectIds)` from H1 ids, not from fetched favorite project rows.
3. Fetch estimate arms in one latency wave:
   - **Recent arm:** estimates with `project_id IN recentEstimateProjectIds`, ordered by `updated_at DESC, id DESC`, limited to the existing recent limit.
   - **Favorite arm:** estimates with `id IN favoriteEstimateIds`, bounded by `favoriteEstimateIds.length` and a hard maximum. This arm must preserve favorite estimates even if they are outside the recent window.
4. Merge/dedupe estimate rows by id in TypeScript.
5. Compute `missingProjectIds` from the merged estimate rows whose project rows are not already present.
6. Fetch project backfill once for `favoriteProjectIds UNION missingProjectIds`.
7. Rebuild visible project maps and visible estimate maps from RLS-filtered rows only. Missing/deleted/invisible favorites remain absent or degraded exactly as today.
8. Run publications, pending-invite summary, and estimate nodes in one tail wave, each behind its existing tolerate/degrade wrapper.
9. Preserve the H7 manage-role filter: pending invite counts use only project ids whose resolved role passes `canManageCollaborationRole(...)`.

## Query Shape Rules

### Preferred implementation

Use two bounded estimate reads in the same `Promise.all` wave. This removes a latency wave without forcing a single `OR` query to carry two different limit semantics.

### Conditional single-query implementation

A single `OR`/`IN` query is allowed only if all of these are proven:

- it returns at most `recentLimit + favoriteEstimateIds.length` logical rows after dedupe;
- it preserves all favorite estimates visible to the caller, including those outside the recent window;
- URL length and PostgREST `.or(...)` escaping are safe for the maximum favorite id set;
- `EXPLAIN (ANALYZE, BUFFERS)` is no worse than the two-arm plan on Medium and Large;
- deterministic order is `updated_at DESC, id DESC` in SQL and in the final TypeScript split.

If any proof fails, reject the single-query shape and keep the two-arm `Promise.all` wave.

## Cardinality Ceilings

| Read | Ceiling |
|---|---:|
| Recent estimates arm | existing recent limit, currently 12 unless changed by the source function |
| Favorite estimates arm | `min(favoriteEstimateIds.length, 50)` unless a stricter current UI limit exists |
| Project backfill | `favoriteProjectIds UNION missingProjectIds`, capped by the same favorite/project list limits that source the ids |
| Estimate nodes | only visible merged estimate ids; no unbounded workspace scan |

Any implementation that removes limits to make batching easier fails this contract.

## Parity Cases

Add or update tests under the repo's existing `tests/vitest` structure, not a fictitious `src/lib/repositories/__tests__` path, unless a new repository-test convention is intentionally introduced.

Required cases:

- recent-only workspace;
- favorites-only workspace;
- favorite estimate also in recent window, appears once;
- favorite estimate outside recent window, still appears in favorites;
- favorite project not in recent projects still contributes to recent-estimate search;
- favorite project deleted or invisible returns no leaked row and does not crash;
- estimate references a project missing from recent/favorite project rows, then backfill resolves it if visible;
- tied `updated_at` values use deterministic `id DESC`;
- viewer/non-manager project does not contribute to pending-invite input;
- optional publications failure does not cancel pending invites or estimate nodes;
- no favorites, no recent projects, no estimates.

## Phase 1 Acceptance

Phase 1 passes only when:

- `WorkshopHomebaseData` is byte-identical to the pre-change baseline after deterministic ordering is applied;
- Branch A latency-wave count drops by the planned count;
- request count does not increase beyond the accepted two-arm/one-tail shape;
- Small and Medium p95 regressions stay within the tolerance in `05-validation-and-measurement-protocol.md`;
- Large p95 improves by the target threshold or the phase is recorded as not worth shipping;
- all hostile cases above have test or measured evidence.
