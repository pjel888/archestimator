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
- Apply: `bun run cf:d1-migrate-local` (or the repo's local D1 migrate script — verify exact name at impl).
- Readback: `bun run tsx scripts/generate-cloudflare-d1-beta-feedback-proof.ts` (extend to assert the 3 new columns + index).

### Linked-provider proof boundary
- D1 readback via the proof script confirms columns on `ARCH_DB`. Hosted apply is the deploy-time step (`13`).

### EXPLAIN expectation
- The sweep SELECT should use `idx_beta_feedback_sla_sweep` (or `idx_beta_feedback_status_created_at`). Capture `EXPLAIN QUERY PLAN ...` at impl; if it table-scans at 10k+ rows, adjust the index. Deferred to impl because the plan/row-count at impl time determines it.

## Blueprint DB-02 — Retention rule (P3, `CONDITIONALLY READY`)

### Affected
- Retention registry (`retention-core.ts` or equivalent — `DISCOVERY-REQUIRED`: locate via `rg "DEFAULT_RETENTION_RULES"` at impl).
- `runRetentionPassInD1` rule list (`worker.ts` / retention module).
- `beta_feedback_submissions` rows (purge target).

### Rule
```ts
{
  table: "beta_feedback_submissions",
  ttlDays: 365,
  purgeSql: "DELETE FROM beta_feedback_submissions WHERE status = 'archived' AND created_at < ?",
  rationale: "Consent + legitimate-interest support data; archived-only purge protects active support.",
}
```

### Purge SQL
`DELETE FROM beta_feedback_submissions WHERE status = 'archived' AND created_at < ?`

### Safety guard
- `WHERE status = 'archived'` — non-archived rows are never purged even if past TTL (T-11, RISK-04).
- Idempotent: re-running deletes nothing more.

### Rollback
- Remove the rule from the registry; existing rows unaffected (purge only deletes, never mutates non-archived).

### Status
`CONDITIONALLY READY` — couples to `OPEN-RET-01` (TTL value) and `OPEN-DEC-004` (retention-schedule ratification). The archived-only guard is safe regardless of the final TTL value.

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
