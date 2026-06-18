# 12 — Phase 3 Ownership, Cutover & Rollout

> Phase 3 is optional. This document prevents double-authoring with the Performance-Refactor pack and makes rollback feature-flag-first.

## Ownership Matrix

| Area | Owner pack |
|---|---|
| Current dashboard query inventory | This pack, `01-current-query-and-round-trip-inventory.md`. |
| Phase 0/1/2 app-only work | This pack. |
| Phase 3 go/no-go evidence | This pack records the dashboard-specific evidence. |
| `workspace_homebase_summary` SQL contract, authz matrix, proof gate, type splice, rollout flag, and migration if Phase 3 proceeds | **This pack is canonical.** Use Performance-Refactor `14_PHASE_8_SUPABASE_DB_PLAN.md` and `22_SECURITY_AND_RLS_THREAT_PLAN.md` as general DB/RLS law, but do not author a divergent homebase RPC there. |
| Performance-Refactor Phase 8 relationship | Back-point to this pack for `workspace_homebase_summary`; continue to own broad DB strategy, other RPCs, indexing posture, and shared RLS/advisor practices. |
| Provider project boundary | Archestimator Supabase project `ebxxqidacheyapmmzavr` only. |

This assignment is the tie-breaker for the two packs. If the older Performance-Refactor Phase 8 text still includes `pending-collab summary` or a different output shape for `workspace_homebase_summary`, that text is stale for this RPC and must be updated or explicitly superseded before implementation. Publications and pending-invite summary remain app-side in this pack's contract.

The repo grants standing pre-launch authorization for scoped Supabase/Postgres work in this project. Therefore this pack does **not** require fresh owner approval for a reversible branch-DB migration/proof inside that boundary. Escalate only for production deploys, destructive data actions, unrelated provider projects, new cost posture, or intentional override of standing policy.

## Phase 3 Go/No-Go Decision Tree

1. Run Phase 0 and Phase 1.
2. If Phase 1 removes the homebase tail as the slowest branch and meets the product threshold in `05-...`, stop. Do not build the RPC.
3. Run Phase 2 if Branch C/library load or dashboard DB load still matters.
4. Consider Phase 3 only if all are true:
   - residual homebase remains the slowest branch on Medium or Large;
   - residual Branch A p95 is still material to user-perceived `/workshop` load;
   - estimated RPC benefit is at least 15% or 150ms additional p95 server-fetch improvement;
   - two-arm app-only query shape is already proven and retained as fallback;
   - security matrix in `11-...` is implementable on a branch DB;
   - Performance-Refactor Phase 8 has been updated or back-pointed so it is not implementing a divergent RPC contract.
5. If any condition fails, keep Phase 1/2 and record Phase 3 as rejected for this pack.

## Two-Deploy Cutover

### Deploy N — additive DB proof

- Apply migration to branch DB first, never production first.
- Author `workspace_homebase_summary` additively; app does not call it.
- Run SQL parity, `EXPLAIN`, RLS denial, advisor, and type splice proof.
- No user-facing behavior changes.

### Deploy N+1 — server-side caller switch

- Gate the caller with a server-only flag, for example `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`.
- Default OFF until parity and denial gates pass.
- Keep app-only Phase 1 path as fallback.
- If RPC returns an expected missing-function/permission/performance failure during rollout, flag OFF first; do not drop the function as the first rollback action.

Use a server-only flag, not `NEXT_PUBLIC_*`, because the decision is server-side and security-sensitive.

## Rollback Order

1. Flip `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED=0`.
2. Confirm app-only path is serving and parity remains green.
3. Revert caller code if necessary.
4. Drop function in a later cleanup migration only after no deployed app calls it.

This preserves the Performance-Refactor safety rule: additive DB first, caller later, feature-flag rollback before schema rollback.

## Duplicate-Contract Stop Rule

If another active plan or agent starts authoring a divergent `workspace_homebase_summary`, stop that divergent work and reconcile back to this pack's contract:

- one authoritative SQL/function signature;
- one authz matrix;
- one `prove:workspace-homebase-summary` gate;
- one `types.ts` additive splice;
- one rollout flag.

Two divergent homebase RPCs are a planning failure even if each is locally correct.
