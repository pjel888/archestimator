# 21 — Database Change Blueprints

Cloudflare D1 binding: `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`). Next migration file: `0039`. All changes are additive and within the standing Cloudflare-resource authorization.

## Blueprint DB-01 — `migrations/0039_beta_feedback_sla_columns.sql`

### Tables / columns / indexes affected
- `beta_feedback_submissions`: add `first_response_at TEXT`, `responded_at TEXT`, `alerted_at TEXT` (nullable).
- New index `idx_beta_feedback_sla_sweep` on `(status, alerted_at, created_at DESC)`.

### App-authz / repository / binding impact
- No new bindings. App-authz unchanged (`requireCurrentUserContext` reporter; `isPlatformAdminRole` operator).
- Repository: `src/lib/workshop/beta-feedback-d1-store.ts` — `updateBetaFeedbackReviewStatusInD1` sets timestamps (`IS NULL` guard); new `updateBetaFeedbackAlertedAt(id)`; `readBetaFeedbackReviewQueueFromD1` gains pagination params.

### SQL sketch
```sql
-- migrations/0039_beta_feedback_sla_columns.sql
-- Additive SLA tracking columns for beta feedback operating loop.
-- All nullable: existing rows are treated as "SLA not tracked".
ALTER TABLE beta_feedback_submissions ADD COLUMN first_response_at TEXT;
ALTER TABLE beta_feedback_submissions ADD COLUMN responded_at TEXT;
ALTER TABLE beta_feedback_submissions ADD COLUMN alerted_at TEXT;

-- Supports the daily SLA breach sweep (filter non-archived, unalerted, by recency).
CREATE INDEX IF NOT EXISTS idx_beta_feedback_sla_sweep
  ON beta_feedback_submissions (status, alerted_at, created_at DESC);
```

### Backfill
None. Existing rows → `NULL` → excluded from breach detection until they age in (acceptable; they predate the SLA).

### Data-volume assumptions
- Beta: <100 feedback rows/month. 10x = 1k, 100x = 10k, 1000x = 100k.
- Sweep scans non-archived rows; at 100k rows this is a sub-second indexed scan on D1 (well within a daily cron budget).

### Concurrency / lock strategy
- `ALTER TABLE ADD COLUMN` (nullable) is non-blocking on D1.
- Timestamp `UPDATE ... WHERE col IS NULL` is row-level; no table lock.

### Expected query count per route/action
- Submit: 1 INSERT (+ notify is egress, not a query).
- Status update: 1 UPDATE + 1 INSERT (event).
- Sweep: 1 SELECT + N UPDATEs (only breached, unalerted rows).
- Pagination read: 1 SELECT per page.

### Cardinality / selectivity
- `idx_beta_feedback_status_created_at` (existing) covers status-filtered pagination.
- `idx_beta_feedback_sla_sweep` covers the sweep's `status != 'archived' AND alerted_at IS NULL` filter (D1 has no partial-index expression syntax portably; the composite covers it).
- PK `id` covers per-row UPDATE.

### Pagination / limits / search
- Page size 50 (default); max 1000 rows returned across all pages at beta (sanity cap).
- `LIMIT ? OFFSET ?` at beta; keyset on `(created_at, id)` if volume grows (out of scope).

### D1 cost / denormalization
- No denormalization needed. SLA badge is computed in-app from timestamps (cheap).

### Generated-type impact
- None. No Worker Env binding change (alert env via raw `process.env`, DEC-08). No `cf:typegen` run required.

### Rollback / fix-forward
```sql
DROP INDEX IF EXISTS idx_beta_feedback_sla_sweep;
ALTER TABLE beta_feedback_submissions DROP COLUMN alerted_at;
ALTER TABLE beta_feedback_submissions DROP COLUMN responded_at;
ALTER TABLE beta_feedback_submissions DROP COLUMN first_response_at;
```
Code tolerates missing columns (null guards) → safe to roll back the schema even if a deploy with the new code is live (the new code paths no-op on null/missing).

### Local proof command
- **Apply (local):** `bunx wrangler d1 migrations apply ARCH_DB --local` (standard Wrangler; the repo has **no** custom migrate script — verified `rg "d1 migrations|migrate" package.json` finds only `cf:deploy`/`cf:typegen`). The `migrations/` directory is the D1 migrations source.
- **Readback (local):** `bun run cf:d1-beta-feedback-proof` (script: `scripts/generate-cloudflare-d1-beta-feedback-proof.ts`) — extend it to assert the 3 new columns + the `idx_beta_feedback_sla_sweep` index.
- **Hosted apply:** `bunx wrangler d1 migrations apply ARCH_DB --remote` at deploy time (owner-gated; standing Cloudflare-resource authorization covers `ARCH_DB`).

### Linked-provider proof boundary
- D1 readback via the proof script confirms columns on `ARCH_DB`. Hosted apply is the deploy-time step (`13`).

### EXPLAIN expectation
- The sweep SELECT should use `idx_beta_feedback_sla_sweep` (or `idx_beta_feedback_status_created_at`). Capture `EXPLAIN QUERY PLAN ...` at impl; if it table-scans at 10k+ rows, adjust the index. Deferred to impl because the plan/row-count at impl time determines it.

## Blueprint DB-02 — Retention rule (P3, `CONDITIONALLY READY`)

**Source of truth (verified 2026-07-07):** `src/lib/compliance/retention-core.ts`. The rule registry is `DEFAULT_RETENTION_RULES: readonly RetentionRule[]` (`:79`). This is a **planned source-code edit, not an additive registry insert** — two changes are required in that file:

### Affected (exact symbols — `src/lib/compliance/retention-core.ts`)
1. **`RetentionClassName` union (`:28-42`)** — this is a *closed* string-literal union. Adding feedback requires appending `| "beta_feedback_submissions"` to the union. This is a source edit, not a data insert.
2. **`DEFAULT_RETENTION_RULES` array (`:79-143`)** — append a new `RetentionRule` object matching the established `selectSql`/`applySql` two-step batched pattern (select ids `LIMIT 500`, then `DELETE ... WHERE id IN (SELECT value FROM json_each(?1))`).

`runRetentionPassInD1` (`:180`) consumes the registry unchanged; the `worker.ts` cron (`30 3 * * *`) calls it with `undefined` rules → uses `DEFAULT_RETENTION_RULES`. No `worker.ts` change needed for the rule itself (the rule is picked up automatically once added to the array).

### Real `RetentionRule` shape (from `retention-core.ts:44-50`)
```ts
export type RetentionRule = {
  className: RetentionClassName;
  ttlDays: number;
  action: RetentionAction;        // "tombstoned" | "anonymized" | "purged" | "soft_deleted" | "skipped_legal_hold"
  selectSql: string;              // returns {id} rows, bound with cutoff timestamp (?1)
  applySql: string;               // deletes/updates by json_each(?1) of the selected ids
};
```

### Proposed rule (matches the established two-step pattern)
```ts
// Append to DEFAULT_RETENTION_RULES in src/lib/compliance/retention-core.ts
{
  className: "beta_feedback_submissions",   // ALSO add this literal to the RetentionClassName union
  ttlDays: 365,                              // OPEN-RET-01 recommended; couples to OPEN-DEC-004 ratification
  action: "purged",
  selectSql:
    "SELECT id FROM beta_feedback_submissions WHERE status = 'archived' AND created_at < ?1 LIMIT 500",
  applySql:
    "DELETE FROM beta_feedback_submissions WHERE id IN (SELECT value FROM json_each(?1))",
}
```

### Safety guard (load-bearing)
- `WHERE status = 'archived'` in `selectSql` — non-archived rows are **never** selected even if past TTL (T-11, RISK-04). A `new`/`reviewing`/`resolved` row past 365 days is retained.
- `LIMIT 500` matches the established per-run batch cap; the daily cron catches up over multiple runs if backlog exceeds 500.
- `applySql` deletes by `json_each` of *only the ids selected by `selectSql`* — so the archived-only filter is enforced at selection time, not deletion time (defense in depth).

### Idempotency
- Re-running the retention pass is safe: once a row is deleted it is gone; the next run selects nothing. The two-step select→delete is inherently idempotent under the `LIMIT 500` cap.

### Rollback
- Remove the rule object from `DEFAULT_RETENTION_RULES` and remove `"beta_feedback_submissions"` from the `RetentionClassName` union. Existing rows are unaffected (purge only deletes archived+old; never mutates non-archived). No migration rollback needed (retention is data, not schema).

### Test
- Extend the retention test suite (locate via `rg "DEFAULT_RETENTION_RULES|runRetentionPassInD1" tests/`) with a fixture: seed (a) an `archived` row older than 365d, (b) a `new` row older than 365d, (c) an `archived` row newer than 365d. Assert: only (a) is purged; (b) and (c) survive.

### Status
`CONDITIONALLY READY` — couples to `OPEN-RET-01` (TTL value) and `OPEN-DEC-004` (retention-schedule ratification). The archived-only guard and the two-step pattern are safe regardless of the final TTL value. The path is now exact (no `DISCOVERY-REQUIRED`): `src/lib/compliance/retention-core.ts`, `RetentionClassName` union + `DEFAULT_RETENTION_RULES` array.

## Blueprint DB-03 — DSAR reachability (P3, coupled)

### Affected
- Privacy-request erasure/export module (owned by `2026-07-07-privacy-request-operations-and-erasure-workflow`).
- `beta_feedback_submissions` by `user_id`.

### Requirement
- Erasure (right-to-be-forgotten): delete or anonymize a user's feedback rows on a valid DSAR. **Decision**: hard-delete is acceptable because feedback is consent-based support data, not a legal-retention-obligation record (confirm with owner/legal — `OPEN-RET-01`).
- Export: include the user's feedback rows in a DSAR export.

### Status
`CONDITIONALLY READY` — owned by the privacy-request pack; recorded here as a dependency.

## No other database changes

No new tables, no R2/DO/Queue changes, no Worker Env binding changes, no generated-type refresh. Legacy `supabase/migrations/*` are out of scope (archaeology only).
