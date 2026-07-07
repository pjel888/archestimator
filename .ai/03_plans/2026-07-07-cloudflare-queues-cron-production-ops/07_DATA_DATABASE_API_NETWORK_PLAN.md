# 07 — Data, Database, API, and Network Plan

## Data ownership & lifecycle

| Data | Owner | Lifecycle | Retention |
|---|---|---|---|
| Queue messages | Cloudflare Queues | ack → gone; retry → re-delivered; DLQ after 3 fails | infra-managed |
| `data_retention_events` | D1 `ARCH_DB` | append-only audit | indefinite (it IS the retention audit) |
| `upload_assets` / `upload_sessions` | D1 | status transitions; rows persist after R2 cleanup | per retention rules when applicable |
| `upload_events` | D1 | append-only job audit | per retention rules |
| R2 proof receipts `provider-proof/jobs/` | R2 `ARCH_UPLOADS_R2` | written per executed/dlq job | operator-managed; no auto-purge currently |
| R2 uploads | R2 `ARCH_UPLOADS_R2` | cleanup job deletes orphaned/expired | per cleanup cutoffs |

## Database change blueprint: DB-INDEX (standalone `created_at` indexes)

**Requirement:** DATA-001. Retention purges scan `WHERE created_at < ?` with no
leading-column equality. Current composite indexes lead with `user_id` /
`event_type` / `publication_id` etc., so the purge does a scan.

**Migration filename:** `migrations/0039_retention_created_at_indexes.sql`
(next after `0038`). Ordering: no dependency on prior content; pure additive
index creation.

**Tables & proposed indexes (IF NOT EXISTS):**

```sql
-- Retention hot path: WHERE created_at < ?  LIMIT N
CREATE INDEX IF NOT EXISTS idx_account_security_events_retention_created
  ON account_security_events (created_at);
CREATE INDEX IF NOT EXISTS idx_collaboration_audit_events_retention_created
  ON collaboration_audit_events (created_at);
CREATE INDEX IF NOT EXISTS idx_shared_link_events_retention_created
  ON shared_link_events (created_at);
CREATE INDEX IF NOT EXISTS idx_estimate_sheet_events_retention_created
  ON estimate_sheet_events (created_at);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_retention_created
  ON privacy_requests (created_at);
```

**Notes:**
- `account_audit_legacy_sha256` reuses `account_security_events` (same table,
  filtered `WHERE ip_hash LIKE 'sha256:%'`); the index above covers it but the
  `ip_hash LIKE 'sha256:%'` predicate is a leading-wildcard LIKE — index on
  `created_at` still helps the time bound; the LIKE filter is post-scan. Acceptable
  given `LIMIT 500`.
- All retention SELECTs already `LIMIT 100/500`, bounding the scan even without
  the index. The index converts a full scan into a range scan.

**Backfill:** none (indexes on existing column).
**Concurrency/locks:** `CREATE INDEX IF NOT EXISTS` on D1 is online-ish; no
table rewrite. Safe on bound `ARCH_DB` under standing Cloudflare authorization.
**Expected cardinality:** at current volume (pre-launch, no external users) the
tables are small; index is forward-looking for 10x–1000x.
**Query count impact:** neutral (retention is once-daily, off-peak 03:30 UTC).
**Cost:** D1 rows-read for the retention SELECT drops from full-scan to
range-scan. Free-tier compatible.
**Rollback / fix-forward:** `DROP INDEX IF EXISTS idx_*_retention_created;` —
fully reversible. Rollback is safe because the SELECTs work without the index
(just slower at scale).
**Local proof:** `bun run cf:build` (type); `wrangler d1 migrations list`
(applied); optional `EXPLAIN` on a retention SELECT against preview D1.
**Provider proof boundary:** readback `PRAGMA index_list(<table>)` on remote
`ARCH_DB` after applying (or staging on preview `363c756a-...`).
**EXPLAIN expectation:** `EXPLAIN QUERY PLAN SELECT id FROM account_security_events
WHERE created_at < ? LIMIT 500` should show `SEARCH ... USING INDEX
idx_..._retention_created` (range) instead of `SCAN`.

**Open:** whether to also add `(created_at)` covering for `privacy_requests`
status/kind variants — current rules filter `status IN ('completed','rejected')`
then `created_at < ?`, so the existing `(status, created_at)` / `(request_kind,
created_at)` indexes already cover. **No new index needed for privacy_requests.**
(Revises the SQL block above: keep `account_security_events`,
`collaboration_audit_events`, `shared_link_events`, `estimate_sheet_events`;
**drop** the `privacy_requests` line.)

**Decision owner:** Philip. Recorded as D-INDEX.

## API / network contracts

### Cron → internal route (HTTP, in-Worker)

| Aspect | Value |
|---|---|
| Method | POST |
| URL | `<CLOUDFLARE_UPLOAD_JOBS_ORIGIN | https://archestimator.internal>/api/internal/{upload-cleanup,upload-scan}?limit=100[&dryRun=1]` |
| Auth | `Authorization: Bearer <UPLOAD_*_JOB_SECRET | CRON_SECRET>` |
| Headers | `x-archestimator-scheduled-cron`, `x-archestimator-scheduled-source: cloudflare-cron`, `accept: application/json` |
| Success | 200 JSON, `Cache-Control: private,no-cache,no-store` |
| 503 | no secret configured OR jobs disabled (non-dryRun) |
| 401 | wrong secret |
| Timeout | bounded by Worker CPU; route itself bounded by `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS=30000` |
| Idempotency | cleanup: re-run safe (R2 gone); scan: D1 UPDATE guarded by checksum |

### Queue message contract (`CloudflareUploadJobQueueMessage` v1)

| Field | Type | Meaning |
|---|---|---|
| `version` | `1` | schema version; bump → new consumer branch |
| `jobName` | `"upload-cleanup"` \| `"upload-scan"` | job type |
| `cron` | string | originating cron expression |
| `enqueuedAt` | ISO string | enqueue time |
| `idempotencyKey` | string | `${jobName}:${cron}:${ISOminute}` |
| `source` | `"cloudflare-cron"` | producer marker |
| `providerProof?` | object | optional proof receipt request |

**Retry policy:** `max_retries=3`, `delaySeconds=60` (app-side `retry({delaySeconds})`);
Cloudflare Queues applies its own backoff. DLQ after final failed attempt.
**Consumer ack semantics:** `message.ack()` removes; `message.retry({delaySeconds})`
re-delivers. `deadLetterExpected` is an app-computed flag for proof; the actual
DLQ move is Cloudflare infra when `max_retries` exhausted.

### Retention pass (in-process, no HTTP)

Direct D1 calls: `SELECT id FROM <table> WHERE created_at < ? LIMIT N` →
`DELETE FROM <table> WHERE id IN (json_each(?))` → INSERT audit. No network.
No auth (in-process). `cronRunId` correlates the pass.

## Access-path matrix

| Source | Chosen path | Runtime role | Authorization | Posture | Proof | Fallback |
|---|---|---|---|---|---|---|
| D1 retention tables | `env.ARCH_DB.prepare(...)` in `runRetentionPassInD1` | Worker scheduled | in-process (no Bearer) | active | `data_retention_events` audit rows | no-op if db null |
| D1 upload tables | route → job runner → `getCloudflareD1Database()` | Worker fetch | Bearer secret | active | `upload_events` audit | 503/401 if no secret |
| R2 uploads | route → `createRuntimeUploadStorageProvider()` | Worker fetch | Bearer secret (route) | active | cleanup/scan provider-proof JSON | cleanup re-runs idempotently |
| R2 proof receipts | `env.ARCH_UPLOADS_R2.put("provider-proof/jobs/...")` | Worker queue | in-process | active | receipt JSON | skipped if no proof id |
| Queue | `env.UPLOAD_JOBS_QUEUE.sendBatch` / consumer | Worker | binding | active | `cf:queues-cron-proof` | skip on missing binding |

## Migration ordering & compatibility

- DB-INDEX (0039) is additive, no data change, reversible. Safe to land
  independently of any code change.
- No existing-data compatibility risk (index only).
- Apply on preview `363c756a-7c4d-42fe-908f-6d328bfa4acb` first, readback, then
  remote `ARCH_DB` under standing authorization.

## Network / retry / timeout behavior

- Cron→route fetch uses the Worker's internal `openNextWorker.fetch` (no real
  network egress; same-Worker subrequest). Bounded by Worker CPU/duration.
- Queue consumer retries with `delaySeconds=60`; Cloudflare applies backoff.
- No outbound third-party calls from the queue/cron path except the scan job's
  scanner provider (ClamAV) and R2 (both in-Worker bindings).
- No external webhooks from this path (the upload-op alert webhook is a
  separate, opt-in sink in the route telemetry, not the queue/cron core).
