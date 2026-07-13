# 07 — Data, Database, API, And Network Plan

## Data ownership

| Surface | Data owner | Cache/freshness | Impact of this plan |
|---|---|---|---|
| `privacy_requests` | D1 (`ARCH_DB`) | no-store | Additive migration `0037`; new columns + new `privacy_request_events` table |
| `data_retention_events` | D1 | append-only | Reused as erasure audit sink (`P3`) |
| `account_security_events` | D1 | append-only | Reused for hashing discipline (unchanged) |
| `security_rate_limit_events` | D1 | sliding window | Reused pattern for intake rate limit (new keys) |
| R2 `privacy-exports/` | R2 (`ARCH_UPLOADS_R2`) | immutable objects | New object namespace for export packages |

## Database change blueprint — `migrations/0037_privacy_request_lifecycle.sql`

- **Filename/order:** `0037_privacy_request_lifecycle.sql` (next after `0036`). Single migration, additive only.
- **Tables/columns affected:**
  - `ALTER TABLE privacy_requests ADD COLUMN identity_verified INTEGER NOT NULL DEFAULT 0;` (boolean 0/1)
  - `ALTER TABLE privacy_requests ADD COLUMN sla_due_at TEXT;` (nullable; set on triage)
  - `ALTER TABLE privacy_requests ADD COLUMN evidence_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(evidence_json) AND json_type(evidence_json)='object');` (fulfillment pointers)
  - `ALTER TABLE privacy_requests ADD COLUMN legal_hold INTEGER NOT NULL DEFAULT 0;` (forward-compatible flag for `OPEN-ERASE-01`)
  - New table `privacy_request_events(id TEXT PK, request_id TEXT NOT NULL, event_type TEXT NOT NULL CHECK(event_type IN ('created','verified','transitioned','note_added','export_generated','erasure_dry_run','erasure_confirmed','email_sent','sla_breached')), from_status TEXT, to_status TEXT, actor_user_id TEXT, actor_ip_hash TEXT, note TEXT, metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid AND object), created_at TEXT NOT NULL)` with `idx_priv_req_events_request_created` on `(request_id, created_at)`.
  - New table `privacy_request_verification_tokens(id TEXT PK, request_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT, created_at TEXT NOT NULL)` with `idx_priv_req_tokens_request` on `(request_id)` and `idx_priv_req_tokens_hash` on `(token_hash)`.
- **SQL sketch detail:** sufficient for the executor to implement without inventing the contract; columns/types/constraints/indexes enumerated above. No FKs (consistent with 0033 which has none; cross-table integrity enforced in the repository).
- **Backfill:** none (defaults are safe: `identity_verified=0`, `evidence_json='{}'`, `legal_hold=0`).
- **Concurrency/locks:** none beyond the new indexes.
- **Expected query count per route/action:** intake=1 INSERT + 1 rate-limit check (≤2 round trips); transition=1 SELECT + 1 UPDATE + 1 event INSERT (3); verify=1 SELECT token + 1 UPDATE request + 1 event INSERT (3); list=1 SELECT; detail=1 SELECT + 1 SELECT events (2).
- **Cardinality:** closed-beta: tens to low hundreds of requests. At 10x/100x/1000x the indexes on `(status, created_at)` (existing) and `(request_id, created_at)` (new) keep queue/detail O(log n). No table scans.
- **Index selectivity:** status filter is selective (5 enum values); request_id is a UUID (highly selective).
- **D1 cost:** all queries are indexed point/range lookups; within free-tier read/write allowances at projected closed-beta volume.
- **Generated type impact:** no Worker Env binding change → **no `bun run cf:typegen` needed.** Row-model types in `privacy-request-repository.ts` updated by the executor.
- **Rollback/fix-forward:** additive migration is safe to leave in place if rolled back; down-migration drops the new columns/tables (data loss only of lifecycle data, not intake). Fix-forward preferred (additive).
- **Local proof command:** apply to local D1 via the project's `cf:d1-*` scripts; `EXPLAIN QUERY PLAN` on the new SELECTs to confirm index usage. Provider proof: apply to remote `ARCH_DB` at execution time (standing authorization).
- **Linked-provider proof boundary:** local D1 apply + `EXPLAIN` is sufficient for `P0`/`P1`; remote apply recorded in evidence ledger at execution.

## API / network contracts

### `POST /api/compliance/privacy-requests` (R1, modified)
- Request: same shape + optional `turnstileToken` (deferred).
- Response: `201 { id, status, createdAt, identityVerified }`.
- Auth: anonymous-or-session; rate-limited per ip (+email-hash).
- Errors: 400 invalid; 429 rate-limited (+`Retry-After`); 500 opaque.

### `GET /api/compliance/privacy-requests` (R3 backing read; operator)
- Query: `?status=&limit=&offset=` (offset pagination — **transient, not shareable**; see `20` URL-state semantics).
- Response: `200 { rows: RedactedRow[] }`, `no-store`.
- Auth: `requirePlatformOperator()` → `isPlatformAdminRole`; else 403.

### `GET /api/compliance/privacy-requests/[id]` (R4 backing read; operator)
- Response: `200 { row, events }`, `no-store`. 404 unknown. 403 non-operator.

### `verifyPrivacyRequest(formData)` (R5, **Server Action** — `"use server"`; token-bearer)
- Convention: matches `beta-allowlist-admin-actions.ts` (`formData`, `requireCurrentUserContext`-style gating for the request, but this action is token-bearer not session). Token travels in the **`formData` request body, never a URL query param** (resolves the C2 transport contradiction).
- Input: `formData` (`requestId`, `token`). Response: `redirect` to lookup with `?verified=1`, or `{ verified: true }`; **410** expired; **409** reused; **404** unknown id (uniform).

### `transitionPrivacyRequest(formData)` (R6, Server Action, operator)
- `formData` (`requestId`, `to`, `note?`); `revalidatePath` operator paths; 409 illegal/unverified.

### Requester status lookup (R2 — the only URL-token route)
- `GET /api/compliance/privacy-requests/[id]/status?token=...` → `200 { status, updatedAt }`; **404 for unknown id AND for bad/expired/consumed token — uniform, no enumeration** (resolves the C5 contradiction). `Referrer-Policy: no-referrer`. Lookup token is single-use, 24h, request-id-bound, re-issued on each transition (resolves C6).

### Export action (R8, Server Action, operator)
- `200 { evidence }`; writes R2 `privacy-exports/<requestId>/<uuid>.json`.

### Erasure dry-run + confirm (R9/R10, Server Actions, operator; `P3`)
- dry-run `200 { counts: {table: n}, dryRunToken }`; confirm `formData(requestId, dryRunToken)` → re-auth + `200 { retentionEventId, evidence }`.

## Access-path matrix

> *(Improved 2026-07-07.)* Each row now cites the **existing** repository/authz symbol that authorizes the access today, or marks the symbol as **NEW** (to be added by the named task) with the gap flagged.

| Source | Chosen API/repository/binding | Runtime role | Authorization check (existing symbol / NEW) | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| privacy_requests (intake write) | `createPrivacyRequest` → D1 `ARCH_DB` | Worker (anonymous) | **existing**: `assertRequestKind` + `sanitizeMetadata`; no authz (intentional public) | 0033 + 0037 | local D1 apply + EXPLAIN; PC-01/02 | 500 opaque |
| privacy_requests (operator read) | `listPrivacyRequests`/`getById` (NEW `getById`) → D1 | Worker (operator) | **NEW** `requirePlatformOperator()` (P1-T1) wrapping **existing** `isPlatformAdminRole` | 0033 + 0037 | PC-07, PC-15 | 403 |
| privacy_requests (verify) | NEW `consumeVerificationToken` → D1 | Worker (token-bearer) | **NEW** token-hash compare (P0-T2); raw token required, hash is lookup-only (see `21`) | 0037 token table | PC-04 | 409/410/404 |
| privacy_requests (status lookup) | NEW `getById` + lookup-token verify → D1 | Worker (token-bearer) | **NEW** lookup-token-hash compare (P0-T4); 404 uniform | 0037 token table | PC-08 | 404 |
| privacy_requests (transition) | NEW `transitionStatus` → D1 | Worker (operator) | **NEW** `requirePlatformOperator()` + state-machine guard (P0-T2/P1-T1) | 0033+0037 | PC-05/06 | 409 |
| rate limit | reuse `security_rate_limit_events` pattern (`recordSecurityRateLimitEventInD1` etc.) | Worker | per-ip (+email-hash) key | existing table | PC-03 | fail-open logged (closed-beta) |
| export package | R2 `ARCH_UPLOADS_R2` `privacy-exports/` | Worker (operator) | **NEW** `requirePlatformOperator()` + request `in_progress`+verified (P2-T1) | new namespace | PC-09/10 | action fails closed |
| erasure audit | `data_retention_events` (existing sink) | Worker (cron + action) | **NEW** `requirePlatformOperator()` + re-auth (P3-T2) | 0034 | retention-repository test pattern; PC-11/12 | retention cron reconciles |
| email | `EMAIL` binding via `sendEmail` | Worker | n/a (outbound) | `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` + provider flag + `CLOUDFLARE_EMAIL_FROM` | `cf:check-email` readiness; **no send/deliverability proof script exists today** (gap) | circuit breaker degrades |

**P0-defect check (directive §10):** every NEW authz symbol is named in a task (`P0-T2` for token/transition repo functions, `P1-T1` for `requirePlatformOperator`, `P2-T1`/`P3-T2` for fulfillment). No access path relies on a symbol that cannot read/write after current migrations. The email deliverability-proof gap is recorded: there is **no** `verify-cloudflare-email-proof.ts` script today (only `cf:check-email` readiness); execution must add a send/receive proof or accept the residual.

## Backward compatibility

- Existing intake callers see an added `identityVerified` field (additive; old clients ignore it).
- The retention cron is unchanged; `0037` does not alter its rule registry.

## Provider-proof boundary

- D1: local apply + `EXPLAIN`; remote apply at execution (standing auth).
- R2: object-write proof at execution against `ARCH_UPLOADS_R2`.
- Email: deliverability proof at execution against `EMAIL` binding.
- No legacy-provider (Supabase) proof in scope.
