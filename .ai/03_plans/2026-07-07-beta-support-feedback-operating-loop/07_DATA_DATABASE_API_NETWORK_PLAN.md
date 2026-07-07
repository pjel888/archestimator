# 07 — Data, Database, API, and Network Plan

Cloudflare D1 is the active data store (`ARCH_DB`, `archestimator-proof-db`). All SQL targets only this binding. Migration order: next file is `0039`. No legacy Supabase/Postgres paths are in scope for this feature (the `supabase/migrations/20260602*` files are archaeology only — do not run or extend).

## Current schema (relevant tables) — `migrations/0001_closed_beta_feedback.sql`

See `03_SOURCE_AND_CODEBASE_AUDIT.md` §C for full column list. Key facts:

- `beta_feedback_submissions`: PK `id`, reporter fields, type/severity/status (CHECK enums), `message` (length-checked), `metadata_json`, `created_at`/`updated_at`.
- `beta_feedback_status_events`: `UNIQUE(feedback_id, status)` → each status can be entered in the audit only once.
- Indexes: `created_at DESC`, `(status, created_at DESC)`, `(user_id, created_at DESC)`.

## Proposed schema change — migration `0039`

(See `21_DATABASE_CHANGE_BLUEPRINTS.md` for the SQL sketch and full blueprint.) Summary:

```sql
-- migrations/0039_beta_feedback_sla_columns.sql
ALTER TABLE beta_feedback_submissions ADD COLUMN first_response_at TEXT;
ALTER TABLE beta_feedback_submissions ADD COLUMN responded_at TEXT;
ALTER TABLE beta_feedback_submissions ADD COLUMN alerted_at TEXT;
-- Optional: an index to support the breach sweep efficiently
CREATE INDEX IF NOT EXISTS idx_beta_feedback_sla_sweep
  ON beta_feedback_submissions(status, alerted_at, created_at DESC);
```

- **Additive, nullable, zero downtime.** No backfill (existing rows → null → treated as "SLA not tracked", excluded from breach detection until they age in).
- **Rollback**: `DROP COLUMN first_response_at; DROP COLUMN responded_at; DROP COLUMN alerted_at; DROP INDEX idx_beta_feedback_sla_sweep;`
- **App-authz**: D1 app-authorization for feedback rows is already enforced server-side via `requireCurrentUserContext()` (reporter) and `isPlatformAdminRole` (operator). No new RLS/row-policy needed (Cloudflare D1 has no RLS; authz is in the repository/action layer).

## Data ownership, lifecycle, retention

| Aspect | Decision |
|---|---|
| Owner | `beta_feedback_submissions` is owned by the feedback lib (`src/lib/workshop/beta-feedback-d1-store.ts`). |
| Lifecycle | `new` → `reviewing` → `resolved` → `archived` (existing 4-status enum). |
| Retention TTL | 365 days, **purge only `archived` rows** (DATA-02). Non-archived rows are never purged even if past TTL (avoid deleting active support). |
| Deletion | hard `DELETE` (or R2 archive if owner prefers an audit copy — owner decision `OPEN-RET-01`). |
| DSAR reachability | feedback rows must be reachable by the privacy-request erasure/export path (couples to `2026-07-07-privacy-request-operations-and-erasure-workflow` P3). |
| Audit history | `beta_feedback_status_events` retains status transitions; `metadata_json` retains `source`. |

## Query behavior

| Query | Shape | Count per route | Index coverage | Cardinality (beta / 10x / 100x / 1000x) |
|---|---|---|---|---|
| Save submission | `INSERT` (1) | 1 per submit | n/a | n/a |
| Read queue (page N) | `SELECT ... WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?` | 1 per page render | `idx_beta_feedback_status_created_at` | 50/page; beta <100 rows, 1k/10k/100k fine with index |
| Update status | `UPDATE` + `INSERT event` | 2 per update | PK + UNIQUE | O(1) |
| SLA sweep | `SELECT id, status, severity, created_at, first_response_at, responded_at, alerted_at FROM beta_feedback_submissions WHERE status != 'archived'` | 1 per sweep | new `idx_beta_feedback_sla_sweep` (or `idx_beta_feedback_status_created_at`) | beta scans <100 rows; 1000x = 100k-row scan — still well within a daily cron (sub-second on D1 at this volume) |
| Set alerted_at | `UPDATE ... WHERE id=? AND alerted_at IS NULL` | 1 per breached row | PK | O(1) |
| Retention purge | `DELETE FROM beta_feedback_submissions WHERE status='archived' AND created_at < ?` | 1 per purge | `idx_beta_feedback_created_at` (filter then check status) | bounded by archived volume; beta negligible |

**N+1 / scan risks**: the sweep is a single SELECT + per-row UPDATE only for breached rows (bounded). No N+1. The pagination uses `LIMIT/OFFSET` (acceptable at beta; if volume grows, switch to keyset on `created_at` — out of scope).

## Transaction boundaries

- Save: single `INSERT` (D1 autocommit). No multi-statement transaction needed.
- Status update: `UPDATE` + `INSERT event` — D1 does not guarantee multi-statement atomicity across separate statements in a single call without `BEGIN`/`COMMIT`. **Decision**: keep the two statements; if the event INSERT fails (e.g. UNIQUE conflict because status was already set), the `UPDATE` to `status` still landed. This is acceptable: the authoritative `status` column is the source of truth; the events table is best-effort audit. Document this in the store.

## Concurrency / idempotency

| Operation | Concurrency risk | Mitigation |
|---|---|---|
| Save | two rapid submits → two rows (no natural key) | client `inlinePending` disables button; post-redirect-get on redirect mode. Accept duplicate at beta; no dedupe key. |
| Status update | two admins update same row | last-write-wins on `status`; `first_response_at`/`responded_at` set with `WHERE col IS NULL` guard → set once. |
| Sweep alerted_at | two sweep runs same day | `UPDATE ... WHERE id=? AND alerted_at IS NULL` → only first run sets it. |
| Follow-up email | resolve → resolve (re-save) | guard `responded_at IS NULL` before sending. |

## API / network behavior

There are **no new Route Handlers** for feedback. All submission/status-update is via Server Actions (`"use server"`). The only network egress is:

1. `sendEmail` → Cloudflare `EMAIL` binding (internal; circuit breaker).
2. `sendFeedbackAlert` → operator webhook (HTTPS only; bearer token).
3. Sweep cron → the `worker.ts scheduled()` handler calls the SLA sweep **in-process** (no internal HTTP route needed, unlike the upload jobs which fetch an internal route). **Decision**: run the sweep directly in `scheduled()` because it does not need a secret-bearer internal route (it runs in the trusted Worker context). This avoids the `buildJobRequest`/secret indirection.

### Server Action contracts (existing, extended)

| Action | Input | Output | Auth | Idempotency |
|---|---|---|---|---|
| `submitBetaFeedback` | `FormData` | redirect `?saved=1|?fallback=1|?error=<code>` | `requireAuth` | none (duplicate possible) |
| `submitBetaFeedbackInline` | `_prev, FormData` | `BetaFeedbackInlineState` | `requireAuth` | none |
| `updateBetaFeedbackReviewStatus` | `FormData` | redirect `?saved=1|?error=<code>` | `isPlatformAdminRole` | status-event UNIQUE; timestamp `IS NULL` guard |

### Cron contract

| Cron | Handler | Bearer | Failure behavior |
|---|---|---|---|
| `45 3 * * *` (new) | `runFeedbackSlaSweep(env)` in `scheduled()` | none (in-process) | catch + `emitLogRecord` error + exit; next-day retry; idempotent |

## Provider-readback proof expectations

- D1 schema proof: `scripts/generate-cloudflare-d1-beta-feedback-proof.ts` already exists — extend it to read back the new columns after `0039` applies.
- Email proof: a one-off send to the operator address with a logged `messageId` (or `mocked:true` in test env) — couples to `OPEN-MON-01`.
- Alert proof: model on `scripts/verify-upload-alert-delivery.ts` → a `verify-feedback-alert-delivery.ts` that posts a test payload and asserts the webhook response (or records operator-attested fallback).

## Generated-type impact

- No Worker Env binding change if alert env is read off raw `process.env` (matches `operational-telemetry.ts` precedent). If owner prefers typed env, run `bun run cf:typegen` after adding the secret to `wrangler.jsonc`. **Recommendation**: raw `process.env` to match precedent and avoid the generated-type refresh step.

## Rollback / fix-forward

- Migration `0039` rollback = `DROP COLUMN` (safe; nullable). Existing code must tolerate null columns even after rollback — guard with `IS NULL` checks (the plan already does).
- Sweep cron: remove the `worker.ts` branch + the cron entry; `alerted_at` simply stops updating (no data loss).
- Notify/follow-up: the hooks are additive; removing them restores prior behavior (no schema impact).
