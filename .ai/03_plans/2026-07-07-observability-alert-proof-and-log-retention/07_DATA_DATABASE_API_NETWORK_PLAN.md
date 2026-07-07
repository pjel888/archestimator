# 07 — Data, Database, API, and Network Plan

## Data ownership summary

| Data | Owner store | Lifecycle | Retention |
|---|---|---|---|
| Operational incidents + events | D1 (`operational_incidents`, `operational_incident_events` — NEW) | declare→contain→resolve→close | 7y (compliance evidence, draft; gated `OPEN-DEC-004`) |
| Retention audit | D1 (`data_retention_events`, exists) | append | per existing rule |
| Alert receipts | gitignored `.ai/99_scratch/alert-proof/*.json` OR R2 | 90d prune | DATA-04 |
| Workers Logs | Cloudflare Workers Observability | platform-managed | ~3d free / 30d+ paid (DATA-03) |
| Email delivery logs | Cloudflare Email | platform-managed | 90d schedule (acknowledgement row) |
| Uploads (orphaned) | D1 `upload_assets`/`upload_sessions` + R2 | app-cleanup cron + retention sweep | 30d (DATA-02a) |
| Expired sessions | D1 Better Auth `session` | retention sweep | 37d draft (DATA-02b) |

## Database change blueprint — DB-01: `0040_operational_incidents.sql`

- **Filename/order:** `migrations/0040_operational_incidents.sql`. The latest applied migration
  is `0039_project_status.sql` (verified), so `0040` is the next free slot. Note: the sibling
  beta-feedback pack's doc proposes `0039_beta_feedback_sla_columns.sql`, but that number is
  **stale** — `0039` is already taken by `project_status`; the beta-feedback pack must renumber to
  `0041+`. Coordinate in `LOOP_LEDGER` to avoid a collision on `0040`.
- **Tables/constraints:**
  ```sql
  CREATE TABLE operational_incidents (
    id TEXT PRIMARY KEY,
    declared_at TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('sev1','sev2','sev3')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','contained','resolved','closed')),
    owner TEXT NOT NULL,
    summary TEXT NOT NULL,
    root_cause TEXT,
    related_request_ids TEXT,        -- JSON array; redacted before insert
    closed_at TEXT,
    CHECK ((status='closed') = (closed_at IS NOT NULL))
  );
  CREATE INDEX idx_op_incidents_status_declared ON operational_incidents(status, declared_at);

  CREATE TABLE operational_incident_events (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES operational_incidents(id) ON DELETE CASCADE,
    occurred_at TEXT NOT NULL,
    event_kind TEXT NOT NULL CHECK (event_kind IN ('declared','status_changed','escalated','note','closed')),
    actor TEXT NOT NULL,
    detail TEXT                       -- redacted
  );
  CREATE INDEX idx_op_incident_events_incident_occurred
    ON operational_incident_events(incident_id, occurred_at);
  ```
- **`data_retention_events.class_name` CHECK (migration `0034`, verified):** the CHECK already
  allows the 14 scheduled classes (`account_security_events`, `account_audit_legacy_sha256`,
  `collaboration_audit_events`, `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`,
  `shared_link_events`, `estimate_sheet_events`, `privacy_requests_completed`,
  `privacy_requests_rejected`, `logs_worker_observability`, `logs_email_delivery`,
  `uploads_orphaned`, `sessions_expired`). It does **NOT** include `operational_incidents`. Since
  incidents are 7y compliance evidence and the retention cron audits via this table, migration
  `0040` **ALTERs the CHECK** to add `operational_incidents` and `operational_incident_events`.
  D1 (SQLite) cannot ALTER a CHECK in place — the migration must drop + recreate the table's
  constraint by rebuilding `data_retention_events` (CREATE new _tmp, INSERT SELECT, DROP old,
  RENAME) OR, simpler and safe given the table is append-only audit with low row count, drop the
  CHECK-bearing table and recreate with the extended list. **Recommendation:** rebuild-via-tmp
  (preserves existing audit rows). Implementation must confirm row count is low before choosing;
  the runbook records the choice.
- **Authz:** writes via a scoped admin Server Action only; no public route. Reads via admin-only
  dashboard or direct D1 query by the on-call.
- **Backfill:** none (new table).
- **Concurrency:** single declarer per incident id (UUID); concurrent declares get distinct ids.
- **Expected cardinality:** low (incidents are rare). At 1000x: still <10k rows — negligible.
- **Query count per declare:** 2 (insert incident + insert event). Per close: 2 (update + event).
- **Index selectivity:** `(status, declared_at)` serves the stale-open-incident query; high
  selectivity on `status='open'`.
- **Generated type impact:** if a repository helper is added, regenerate types via the repo's
  existing typegen (`bun run cf:typegen` if Worker Env bindings change — they don't here; D1 row
  types are app-side).
- **Rollback/fix-forward:** `DROP TABLE operational_incident_events;
  DROP TABLE operational_incidents;` — safe (new, no dependencies).
- **Local proof:** `wrangler d1 migrations apply ARCH_DB --local` (or repo's
  `cf:d1:migrate:local` equivalent) + `EXPLAIN` the stale query.
- **Provider-proof boundary:** hosted D1 migrate is within the standing Cloudflare mandate;
  record the readback in the ledger.

## Database change blueprint — DB-02: retention rules (no schema change)

- **Filename/order:** none (code change in `retention-core.ts` `DEFAULT_RETENTION_RULES`).
- **Affected rules added:**
  - `uploads_orphaned` → SELECT on `upload_assets` (status='deleted', updated_at<=cutoff-30d) and
    `upload_sessions` (status IN expired/deleted, expires_at<=cutoff-1d). **Coordinate seam with
    `src/lib/uploads/cleanup.ts`** — that job deletes R2 objects + rows; this rule is the
    audit-class safety-net sweep. To avoid double-work, the rule selects only rows the cleanup
    job *would have* already handled and is effectively a backstop; document the ordering (cleanup
    runs `0 3`, retention runs `30 3`).
  - `sessions_expired` → SELECT on Better Auth `session` table (expires_at <= now-30d grace).
    Confirm table name/shape from the generated Better Auth D1 migration
    (`compileCloudflareBetterAuthD1Migrations` output) before writing the SQL.
  - `ai_action_runs`/`ai_tool_calls`/`ai_data_access_events` → 365d purge (tables exist per
    `0006`; feature deferred, so 0 rows today — forward-compat).
  - `logs_worker_observability`/`logs_email_delivery` → **not D1 rules**; policy-acknowledgement
    rows only (DATA-03/DATA-04).
- **Migration order deps:** none (code-only); must land after sibling REL-02 (time/row budget
  options) if that pack ships first, else guard with default options.
- **Expected query count per pass:** +5 SELECTs + ≤5 DELETEs (one per new actionable rule).
- **Cardinality:** `uploads_orphaned`/`sessions_expired` could be non-trivial at scale but bounded
  by the cleanup job + the per-tick row budget (sibling REL-02).
- **Rollback:** remove the rules from `DEFAULT_RETENTION_RULES` (code revert).

## Access-path matrix

| Source | Chosen path | Runtime role | Authorization | Latest posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Workers Observability logs (S-02 signal) | GraphQL API (read token) | external poller | read-only API token (owner-set) | persist:true, 0.1 sampled | provider-backed receipt | dashboard manual observation (degraded) |
| Queue DLQ depth (S-04) | Wrangler/Queue metadata API | external poller or worker | account token | DLQ `archestimator-upload-jobs-dlq` exists | provider-backed receipt | dashboard |
| Cron summary (S-05) | Workers Observability log `cron.complete ok:false` | external poller | read token | requires sibling FR-02 to emit the summary | provider-backed receipt | wrangler tail manual |
| Email alert channel | EMAIL binding → support inbox | worker | binding + circuit breaker | transactional client exists | inbox token receipt | webhook backup |
| Incident write | D1 via admin Server Action | admin user | Better Auth admin authz | new table | local unit + hosted readback | n/a |
| Retention sweep | D1 via cron `30 3` | cron (CRON_SECRET) | internal | 7→14 rules | local unit + dry-run | fix-forward |

If a chosen path cannot read its source after current migrations/authz/policies, it is a P0
defect: add a scoped implementation path or remove the source from the launch-gate set and mark
the scenario `proofClass: local-automated` with owner acceptance (which would block GATE-02 for
the 4 critical scenarios).

## API / network behavior

- **No new public HTTP routes.** Incident declare/close are admin Server Actions (POST-shaped,
  authz-gated), not public Route Handlers.
- **External poller (S-02):** an HTTPS GET to Cloudflare GraphQL with a read token; bounded
  timeout (10s), retry cap (3), exponential backoff. Owned by `OPEN-ALERT-01` host choice.
- **Email alert:** reuses `TransactionalEmailClient` (circuit breaker, cooldown). Operational
  alerts use a distinct `operational_alert` kind for log filtering.
- **Webhook (upload-ops, extended):** keep HTTPS-only, bearer-redact, payload-path-safe (already
  enforced by `verify-upload-alert-delivery.ts`); extend to *log outcome*.
- **Idempotency:** alert receipts are keyed by `(scenarioId, sentAt-bucket)` so a retried poll
  updates rather than duplicates; incident events are append-only with distinct ids.

## Data retention, deletion, audit, recovery (this plan's slice)

- **Incidents:** 7y retention (compliance evidence) — added to schedule, gated `OPEN-DEC-004`.
- **Evidence artifacts:** 90d prune (DATA-04).
- **No new deletion of end-user data** by this plan. The retention-rule additions delete only
  already-expired operational rows (orphaned uploads, expired sessions) per the existing schedule.
- **Recovery:** a D1 restore resurrects purged audit/incident rows — acceptable for compliance
  evidence; the runbook notes that a restore also resurrects purged *privacy-request* rows (cross-
  ref backup pack REQ-SEC-03) requiring a post-restore re-erasure check.

## Database/provider-proof summary

- Local proof: migration applies; unit tests pass; dry-run retention selects expected rows.
- Provider-backed proof (required external gate): hosted D1 migration readback for `0040`; hosted
  retention-pass `data_retention_events` rows; hosted alert receipts (GATE-02).
- No claim of hosted proof from local-only checks.
