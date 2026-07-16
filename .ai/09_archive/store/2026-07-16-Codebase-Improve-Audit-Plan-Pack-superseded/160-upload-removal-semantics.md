# Plan UNIT-007: Upload removal — per-asset eligibility, distinct results, matching index

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/uploads/removal-claims.ts src/app/api/projects/images/route.ts src/app/api/component-library/attachments/route.ts src/app/api/component-library/images/route.ts src/lib/uploads/cleanup-job.ts`.

## Status
- **Priority:** P2 · **Effort:** M · **Risk:** MED · **Depends on:** — (UNIT-016 depends on this) · **Category:** bug/perf
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (claim-function unit tests for mixed batches)

## Why this matters
Upload removal is **all-or-nothing**: the claim UPDATE gates the entire matched set on `NOT EXISTS (... candidate ... referencePredicate)` (`removal-claims.ts:253-258`), so if *any* matched file is referenced, **none** are removed and the caller learns only `"referenced"` with no per-path detail. Separately, the 3 route handlers return HTTP 200 with `removedPaths = <requested paths>` on `already_claimed` — indistinguishable from a real removal (misleading success). And the matching path lacks a composite index (workspace-wide scan per claim). This unit fixes the contract and adds the index; UNIT-016 later replaces the `json_tree` predicate with a reference table.

## Current state
- `src/lib/uploads/removal-claims.ts:239-267` — claim UPDATE with the whole-set `NOT EXISTS (… referencePredicate)` gate; `RETURNING id, storage_path, thumbnail_path`.
- `:282-296` — diagnostic returns `referenced` / `already_claimed` / `not_found`.
- `src/lib/uploads/cleanup-job.ts:469-498` — **re-runs** `NOT (referencePredicate)` before setting `purge_state='purged'` (storage-side backstop — keep consistent with any predicate change).
- Route handlers: `src/app/api/projects/images/route.ts:566-568`, `src/app/api/component-library/attachments/route.ts:708-710`, `src/app/api/component-library/images/route.ts:362` — `removedPaths: claim.status === "claimed" ? claim.claimedPaths : <requestedPaths>`.
- Indexes: `idx_upload_assets_workspace_created` (`0010:121`) leads with `(workspace_id, created)` — no `(workspace_id, surface, storage_bucket, storage_path)`.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) claim tests | `bun run test:dom -- tests/vitest/upload-removal-claims.test.ts` (if authorized) | pass |

## Scope
**In scope:** `src/lib/uploads/removal-claims.ts`; the 3 route handlers' response shaping; a new migration adding the composite lookup index; the claim-result type.
**Out of scope:** the `json_tree` predicate itself (UNIT-016 replaces it — here it stays, just moved per-row). The cleanup-job backstop logic (keep its predicate call signature stable). Storage deletion mechanics.

## Steps
### Step 1 — Per-asset eligibility
Refactor the claim UPDATE so the reference check is in the **per-row** `WHERE` (each candidate independently eligible): `… WHERE asset.id IN (SELECT id FROM matched_assets) AND asset.status IN ('pending','finalized') AND asset.purge_state='active' AND NOT EXISTS (SELECT 1 FROM upload_assets candidate WHERE candidate.id = asset.id AND (<referencePredicate>))`. This lets a mixed batch remove the free files while leaving referenced ones.
### Step 2 — Distinct result sets
Return `{ status, removedIds, removedPaths, blockedIds, blockedPaths }`. After the UPDATE, run the diagnostic over the *remaining* matched set to classify each unclaimed asset as `referenced` vs `already_claimed` vs `not_found` and populate `blockedIds`. Keep `not_found` for zero-match.
### Step 3 — Fix the misleading-200 (F-11)
In the 3 route handlers, return the distinct result: `removedPaths` = only the actually-removed; surface `blocked`/`alreadyRemoved` separately (e.g. a `blockedPaths` field or a `status` field) so the client can show an honest affordance instead of a success toast for a no-op.
### Step 4 — Add the matching index (F-12)
New migration: `CREATE INDEX IF NOT EXISTS idx_upload_assets_lookup_path ON upload_assets(workspace_id, surface, storage_bucket, storage_path);` (and/or a `thumbnail_path` variant if thumbnail lookups dominate). Replay-safe (`IF NOT EXISTS`) per the UNIT-001 idiom.
### Step 5 — Keep the cleanup-job backstop consistent
Confirm `cleanup-job.ts:469-498` still calls the same `referencePredicate` export with the same arity; the per-row refactor must not change the predicate's meaning, only where it's applied.
### Step 6 — (TEST_PROPOSAL) claim tests
`tests/vitest/upload-removal-claims.test.ts`: mixed batch `[referenced, free, already-removed]` → removes the free one, blocks the referenced, reports already-removed distinctly; all-referenced → `blocked`, nothing removed; all-free → all removed.
**Verify:** `bun run type-check` + `bun run lint` exit 0; route handlers return distinct shapes; index migration applies to shadow D1.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] Claim function returns distinct `removed`/`blocked`/`already_claimed` sets
- [ ] No route handler returns requested paths as `removedPaths` on a non-claim
- [ ] `idx_upload_assets_lookup_path` migration applies and is replay-safe
- [ ] Cleanup-job backstop predicate call unchanged in meaning
- [ ] Claim tests pass (if authorized)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- A client of the removal API depends on the old "requestedPaths as removedPaths" shape — STOP and update that client in the same change (note it).
- The per-row predicate performs worse than expected on a large workspace even with the index — confirm the index is used (`EXPLAIN QUERY PLAN`) before landing.
- The cleanup-job backstop semantics would change — preserve them exactly.

## Maintenance notes
- UNIT-016 will replace `uploadAssetAcceptedReferencePredicate` with a reference-table `EXISTS`; the distinct-result contract from Step 2 must survive that swap.
- New removal callers should consume `removedIds`/`blockedIds`, not `removedPaths` alone.
- The composite index adds write cost on every upload — acceptable; revisit only if upload write latency regresses.
