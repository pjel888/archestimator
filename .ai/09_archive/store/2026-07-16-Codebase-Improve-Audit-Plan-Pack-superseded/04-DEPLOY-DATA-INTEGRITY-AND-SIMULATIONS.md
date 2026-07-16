# 04 — Deploy, Data-Integrity, and Concurrency Simulations

Scenario walk-throughs (not executed — planning only) for the data-integrity findings. Each states the preconditions, the **today** behavior, the **after-fix** behavior, and the evidence that would prove it. These are the "simulations" the owner requested; they are reasoned from the SQL/TS read during vetting.

## Migration safety (UNIT-001)

### Sim A — unrelated FK orphan blocks the upload migration
- **Preconditions:** hosted `ARCH_DB` has a pre-existing FK violation in an unrelated table (e.g. an orphaned row from an older bug).
- **Today:** `0084:223` and `0087:135` run `INSERT INTO __NNNN_assertion SELECT 1 WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check)`. `pragma_foreign_key_check` returns **all** FK violations DB-wide → assertion fires → `RAISE(ROLLBACK, '*_preflight_failed')` → **entire migration aborts**. The upload-lifecycle changes (triggers, indexes, columns) never apply. Message gives no table hint.
- **After UNIT-001:** the check is scoped to the upload tables (explicit orphan queries over `upload_assets`/`upload_sessions`/`upload_asset_cleanup_objects` driven by `pragma_foreign_key_list`). The unrelated orphan no longer blocks; a *real* upload-table orphan still trips the scoped check.
- **Proof:** apply edited migrations to a shadow D1 with a seeded unrelated orphan → migration succeeds; seed an `upload_assets` orphan → migration ROLLBACKs with the scoped message.

### Sim B — historical NULL `actor_user_id` trips 0087
- **Preconditions:** a historical `upload_assets` row whose `actor_user_id` is NULL (column is nullable TEXT since `0010:47`) while its session has an actor.
- **Today:** `0087:18` `asset.actor_user_id IS NOT session.actor_user_id` → `NULL IS NOT '<session-actor>'` → TRUE (SQLite `IS NOT` treats NULL as a distinct value) → assertion fires → migration ROLLBACKs.
- **After UNIT-001:** an idempotent backfill immediately before the assertion copies `actor_user_id` (and workspace/surface/bucket/path) from the session onto divergent asset rows; the assertion then passes. (Column nullability is left as-is to avoid a broader schema change; the trigger at `0087:31-43` enforces parity going forward.)
- **Proof:** seed a NULL-actor asset in shadow D1 → pre-fix migration aborts; post-fix migration applies and the row now mirrors its session.

### Sim C — migration replay / dev-DB reset
- **Preconditions:** a second apply of 0084–0087 (dev reset, shadow replay, recovery).
- **Today:** `CREATE TABLE __0084_assertion` / `CREATE [UNIQUE] INDEX` / `CREATE TRIGGER` without `IF NOT EXISTS` (0084:4,95,99,104,109,126,143,157,171,192; 0085:1,71,301,307; 0086 triggers) → hard-fail on the second `CREATE`. (0087 partially guards its two session triggers with `DROP TRIGGER IF EXISTS` at :25-27.)
- **After UNIT-001:** DDL gated with `IF NOT EXISTS` / `CREATE OR REPLACE` (where SQLite version supports) and `DROP … IF EXISTS` before trigger redefinitions. Replay-safe.
- **Proof:** apply migrations twice to shadow D1 → second apply succeeds no-op.

### Sim D — removed asset with NULL/unparseable `updated_at`
- **Preconditions:** an `upload_assets` row reaches `status='removed'` with `updated_at` NULL or non-ISO (edge; `updated_at` is app-set, normally ISO).
- **Today:** `0087:93-97,114-118` `cleanup_not_before = COALESCE(cleanup_not_before, strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at, '+5 minutes'), NEW.updated_at)`. `strftime` on NULL/unparseable → NULL; second COALESCE arm = `NEW.updated_at` (NULL) → **`cleanup_not_before = NULL`**. The cleanup-queue index (`0084:104`, leading column `cleanup_not_before`) sorts NULLs first in SQLite → the row can be purged **out of order, before the intended 5-minute `REMOVAL_DELAY_MS` delay** (`removal-claims.ts`).
- **After UNIT-001:** trigger falls back to `strftime('…', 'now', '+5 minutes')` (and/or `updated_at` is constrained `NOT NULL`/defaulted) → the safety delay always holds.
- **Proof:** seed a removed asset with NULL `updated_at` → pre-fix `cleanup_not_before` is NULL; post-fix it is `now+5m`.

## Concurrency / idempotency (cross-cutting, context for UNIT-007/016 and the rejected idempotency items)

### Sim E — duplicate reply submit (publisher-discussion, known DEFERRED)
- **Preconditions:** two concurrent identical `replyToClientPortalThreadAsOwner` calls with the same `idempotencyKey`.
- **Today:** both pass the replay `SELECT` (`publisher-discussion-service.ts:212`), both enter `runBatch`; D1 `batch()` is atomic → the second's INSERT fails the (future) unique constraint → **fail-closed**: the second caller gets a generic error, not `replayed:true`. No duplicate message is written.
- **Note:** this is the documented DEFERRED DEF-03; not re-planned here. Recorded so the behavior is understood as *safe, noisy*.

### Sim F — duplicate estimate mutation (mutation-receipts)
- **Preconditions:** two concurrent identical-intent estimate mutations.
- **Today:** both pass the receipt read (`mutation-receipts.ts:61`), both batch-write; the second's receipt INSERT fails → the **whole atomic batch rolls back** (business mutation + receipt together) → no partial state; the second caller gets a hard error, not a replay.
- **Note:** fail-closed and safe; adding `ON CONFLICT … DO NOTHING` + re-read is low-ROI polish, not a unit.

### Sim G — upload removal contention (UNIT-007 target)
- **Preconditions:** a removal request for `[assetA (referenced), assetB (free), assetC (already removed)]`.
- **Today:** the `NOT EXISTS (... candidate ... referencePredicate)` at `removal-claims.ts:253` gates the **entire** matched set on assetA being unreferenced → false for all rows → UPDATE affects 0 → diagnostic returns `"referenced"` for the whole request. assetB is **not** removed; the caller learns only "referenced" with no per-path detail.
- **After UNIT-007:** the reference check moves into the per-row `WHERE` → assetB is removed, assetA is blocked; the response returns distinct `removedIds:[B]` and `blockedIds:[A]`; assetC returns `already_claimed` distinctly (fixing F-11's misleading-200).
- **Proof:** unit test over the claim function with the mixed fixture above.

## Data-loss backstop (confirmed during vetting, not a finding)

The upload purge path has a defense-in-depth backstop: `cleanup-job.ts:469-498` re-runs `NOT (referencePredicate)` immediately before setting `purge_state='purged'`. So even if a removal claim missed a reference, storage is not deleted. This is why the `json_tree` heuristic's correctness held up under vetting (it would have caught a real blind spot) and why UNIT-016 is "scale permitting," not urgent.
