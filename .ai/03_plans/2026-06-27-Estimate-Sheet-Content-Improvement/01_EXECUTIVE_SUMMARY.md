# Executive Summary

## Readiness Position

Current status: **CONDITIONALLY READY for Phase 0/0.5 planning handoff; broad implementation and first-user release remain NO-GO**.

The estimate sheet already has meaningful foundations: optimistic row state, row revision checks, event-history RPCs, same/cross-branch row movement, virtualized row tables, a move-row dialog fallback, load-limit guards, and focused tests. It is not yet safe to claim the page is bug-free or lag-free. The current system still exposes routine row/tree saves through global toasts, has only partial queue semantics, does not prove all CRUD actions under stale/offline/concurrent conditions, and has security/data-integrity gaps that must be closed before first-user confidence.

## Highest-Impact Findings

| Severity | Finding | Evidence | Required Outcome |
|---|---|---|---|
| Critical | Routine row saves are noisy and feel blocking. | `src/components/workshop/EstimateSheetContent.tsx:953-973` emits saving/saved/failure global toasts for row mutations. | Routine persistence becomes invisible or inline; only failures interrupt, with retry/revert. |
| Critical | Row movement is blocked by global dirty/saving state. | `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:1027-1029` refuses row moves while `saveState` is `dirty` or `saving`. | Non-conflicting actions queue or proceed without blocking the sheet; dependent conflicts are local and explained. |
| Critical | Content-to-tree row move bug remains unproven. | Row drag originates in `row-table.tsx:340-375`, tree external drop dispatches `REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT` at `EstimateSheetTree.tsx:963-971`, and content handles it at `EstimateSheetContent.tsx:1923-1931`. | Browser and unit proof must cover row drag/reorder after a content-to-tree move, including target-area sibling rows. |
| High | Persistence queue semantics are incomplete. | `use-estimate-row-mutations.ts:742-779` serializes only some per-row actions; cross-row/tree actions run outside that queue. | A typed mutation coordinator owns ordering, idempotency, local status, retry, rollback, and stale-success rejection for all content actions. |
| High | Data integrity and cache invalidation are inconsistent. | `actions.ts:1594-1598` centralizes revalidation, but many row mutations rely on client cache; row move clears process cache at `actions.ts:3228`. | Every content mutation has a shared finalization path and cache freshness proof after reload/navigation. |
| High | Security gates need DB/API hardening. | Security audit found authenticated RPC and private image/history authorization gaps. | DB mutation RPCs enforce edit checks internally; private images/history require project/estimate access; source snapshots are allowlisted. |
| High | Server Action/public/export attack surfaces need explicit gates. | Next local docs warn Server Functions are direct-POST reachable; this route also has share/proposal/export/comment/activity surfaces. | Phase 0.5 inventories actions/routes/RPCs, enforces safe DTOs, abuse/rate-limit posture, token revocation, and direct invocation tests before broad UX work. |
| High | App Router boundary/cache behavior must stay route-specific. | Target route resolves server context and hydrates a client workspace; `next.config.ts` also changes cache/image/security behavior. | Server-owned auth/context, client-owned live cache, route process-cache clearing, and `revalidatePath` decisions are explicit per mutation class. |
| High | Performance evidence is fragmented. | Perf tests exist but baseline tests mostly record timings; route budgets do not prove sheet mutation latency. | Budgeted evaluators cover route, typing, totals, drag hover/drop, queue age, cache freshness, offline retry, and large sheets. |

## Recommended Strategy

Implement in controlled phases:

1. Lock current behavior and bug repros with failing tests and action-matrix coverage.
2. Run Phase 0.5 security/data gates: direct RPC/action tests, direct browser write reachability, public/export DTO redaction, abuse/rate posture, and route/cache contract proof.
3. Replace global routine save toasts with a quiet local mutation-status model only after gates are closed or explicitly waived.
4. Introduce a default-off mutation coordinator behind a feature flag.
5. Route all row/content mutations through server actions/RPCs with stable mutation IDs and shared finalization.
6. Fix and prove content-to-tree row move/reorder stability.
7. Convert performance profiles into pass/fail budgets and run targeted browser proof only for browser-only claims.

## Release Gate

The future implementation is not ready for first users until `12_TEST_AND_VALIDATION_STRATEGY.md`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`, and `19_BENCHMARK_CONTRACTS.md` pass with fresh evidence. Local tests alone cannot prove provider, browser, or production readiness.
